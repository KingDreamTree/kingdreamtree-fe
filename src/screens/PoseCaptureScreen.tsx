import { useCallback, useEffect, useRef, useState } from 'react'
import { FixedStepFrame } from '../components/FixedStepFrame'
import { createHoldGate, evaluate, IDX, MESSAGES, SEGMENTS, type EvaluateResult, type PoseCriteria, type PoseLandmarks } from '../lib/pose-score.js'
import { loadVideoLandmarker } from '../lib/landmarkers'
import { areaRatio, chooseScaleBasis, findOutOfRangeLandmark } from '../lib/pose-detector'
import { RefitApiError, uploadUserPhoto, userFacingMessage } from '../lib/api'
import poseCornerTopLeft from '../assets/pose-corner-top-left.svg'
import poseCornerTopRight from '../assets/pose-corner-top-right.svg'
import poseCornerBottomLeft from '../assets/pose-corner-bottom-left.svg'
import poseCornerBottomRight from '../assets/pose-corner-bottom-right.svg'
import poseScoreRing from '../assets/pose-score-ring.svg'
import poseScoreArc from '../assets/pose-score-arc.svg'
import poseSuccessCheck from '../assets/pose-success-check.svg'
import poseFailLineOne from '../assets/pose-fail-line-1.svg'
import poseFailLineTwo from '../assets/pose-fail-line-2.svg'

type PoseCaptureScreenProps = {
  sessionId: string
  criteria: PoseCriteria
  refLm: PoseLandmarks
  refAspect: number
  /** 레퍼런스의 크기 기준 — 사용자 사진도 같아야 서버가 받는다. */
  refScaleBasis: 'TORSO' | 'HIP_KNEE'
  referenceUrl: string
  onNext: () => void
  /** 갤러리에서 사진을 골라 업로드 판정 경로로 전환한다. */
  onBrowse: (file: File) => void
}

type Phase =
  | { kind: 'starting' }
  | { kind: 'live' }
  | { kind: 'uploading' }
  | { kind: 'done' }
  /** 422 — 사진에 문제가 있다 → 재촬영 */
  | { kind: 'rejected'; message: string }
  /** 503 — 판정하지 못했다 → 같은 사진으로 재시도 */
  | { kind: 'retry'; message: string }
  | { kind: 'camera-error'; message: string }

type CapturePayload = {
  file: File
  url: string
  lm: PoseLandmarks
  result: EvaluateResult
  multiPerson: boolean
}

type Hud = { message: string; score: number | null; progress: number }

// docs/FRONTEND-HANDOFF.md §2 촬영 안내 문구 (필수)
const CAPTURE_GUIDES = [
  '정면으로 서고, 머리부터 발까지 나오게',
  '팔을 몸에서 15~30도 벌려주세요',
  '몸에 붙는 옷을 입어주세요',
  '배경이 단순한 곳에서',
]

const RETRY_MESSAGE = '일시적인 문제로 사진을 확인하지 못했어요. 잠시 후 다시 시도해주세요.'

/** 한 번 "차단"을 누른 브라우저는 다시 묻지 않으므로 원인별로 해결 방법을 안내한다. */
function cameraErrorMessage(error: unknown) {
  const name = error instanceof DOMException ? error.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError')
    return '카메라 권한이 차단되어 있어요. 주소창 자물쇠 아이콘 → 카메라 허용 후 다시 시도를 눌러주세요.'
  if (name === 'NotFoundError' || name === 'OverconstrainedError')
    return '사용할 수 있는 카메라를 찾지 못했어요. 카메라가 있는 기기에서 열어주세요.'
  if (name === 'NotReadableError')
    return '다른 앱이 카메라를 사용하고 있어요. 해당 앱을 닫고 다시 시도해주세요.'
  return '카메라를 열 수 없어요. 브라우저 카메라 권한을 확인해주세요.'
}

export function PoseCaptureScreen({ sessionId, criteria, refLm, refAspect, refScaleBasis, referenceUrl, onNext, onBrowse }: PoseCaptureScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const refImageRef = useRef<HTMLImageElement>(null)
  const skeletonRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const capturedRef = useRef(false)
  const payloadRef = useRef<CapturePayload | null>(null)
  const phaseRef = useRef<Phase['kind']>('starting')
  const hudRef = useRef<Hud>({ message: '', score: null, progress: 0 })

  const [phase, setPhaseState] = useState<Phase>({ kind: 'starting' })
  const [hud, setHud] = useState<Hud>({ message: '카메라를 준비하고 있어요…', score: null, progress: 0 })
  const [initNonce, setInitNonce] = useState(0)

  const setPhase = useCallback((next: Phase) => {
    phaseRef.current = next.kind
    setPhaseState(next)
  }, [])

  /**
   * 레퍼런스 사진 위에 관절 스켈레톤을 그린다 (web/pose-live.html 참고).
   * 사진은 letterbox(contain)로 들어가므로 실제 그려진 사각형에 좌표를 맞춘다.
   */
  const drawReferenceSkeleton = useCallback(() => {
    const image = refImageRef.current
    const canvas = skeletonRef.current
    const box = canvas?.parentElement
    if (!image || !canvas || !box || !image.naturalWidth) return
    const cw = box.clientWidth
    const ch = box.clientHeight
    if (!(cw > 0 && ch > 0)) return
    canvas.width = cw
    canvas.height = ch
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, cw, ch)

    const scale = Math.min(cw / image.naturalWidth, ch / image.naturalHeight)
    const dw = image.naturalWidth * scale
    const dh = image.naturalHeight * scale
    const ox = (cw - dw) / 2
    const oy = (ch - dh) / 2
    const X = (p: { x: number }) => ox + p.x * dw
    const Y = (p: { y: number }) => oy + p.y * dh

    ctx.strokeStyle = '#ffe250'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    for (const [, a, b] of SEGMENTS) {
      if (!refLm[a] || !refLm[b]) continue
      ctx.beginPath()
      ctx.moveTo(X(refLm[a]), Y(refLm[a]))
      ctx.lineTo(X(refLm[b]), Y(refLm[b]))
      ctx.stroke()
    }
    const sl = refLm[IDX.shoulderL], sr = refLm[IDX.shoulderR], hl = refLm[IDX.hipL], hr = refLm[IDX.hipR]
    if (sl && sr && hl && hr) {
      ctx.beginPath()
      ctx.moveTo((X(sl) + X(sr)) / 2, (Y(sl) + Y(sr)) / 2)
      ctx.lineTo((X(hl) + X(hr)) / 2, (Y(hl) + Y(hr)) / 2)
      ctx.stroke()
    }
    // 가려진 관절은 MediaPipe 추측값 — 흐리고 작게 그려서 추측임을 알 수 있게 한다.
    for (const i of Object.values(IDX)) {
      const p = refLm[i]
      if (!p) continue
      const visibility = typeof p.visibility === 'number' ? p.visibility : 1
      const weak = visibility < criteria.min_visibility
      ctx.fillStyle = weak ? 'rgba(246, 246, 246, .3)' : '#f6f6f6'
      ctx.beginPath()
      ctx.arc(X(p), Y(p), weak ? 2.5 : 4, 0, Math.PI * 2)
      ctx.fill()
    }
  }, [criteria.min_visibility, refLm])

  useEffect(() => {
    drawReferenceSkeleton()
  }, [drawReferenceSkeleton])

  const uploadCapture = useCallback(async (payload: CapturePayload) => {
    setPhase({ kind: 'uploading' })
    try {
      await uploadUserPhoto(sessionId, {
        file: payload.file,
        captureSource: 'CAPTURE',
        poseLandmarks: payload.lm,
        poseSimilarity: payload.result.pose_similarity,
        framingScore: payload.result.framing_score,
        poseScaleBasis: chooseScaleBasis(payload.lm),
        facingDelta: payload.result.facing_delta,
        poseOks: payload.result.oks,
        posePersonAreaRatio: areaRatio(payload.lm, 1, 1),
        multiPerson: payload.multiPerson,
      })
      setPhase({ kind: 'done' })
    } catch (error) {
      if (error instanceof RefitApiError && error.status === 503) {
        setPhase({ kind: 'retry', message: RETRY_MESSAGE })
      } else if (error instanceof RefitApiError) {
        setPhase({ kind: 'rejected', message: userFacingMessage(error, '사진을 처리하지 못했어요. 같은 포즈로 다시 촬영해주세요.') })
      } else {
        setPhase({ kind: 'retry', message: RETRY_MESSAGE })
      }
    }
  }, [sessionId, setPhase])

  useEffect(() => {
    let cancelled = false
    let raf = 0
    const hold = createHoldGate(criteria)

    // 점수·게이지는 프레임마다 튀므로 지수 이동 평균으로 부드럽게 따라가게 한다.
    const smooth = { score: 0, hasScore: false, progress: 0 }
    const updateHud = (result: EvaluateResult | null) => {
      if (result) {
        smooth.score = smooth.hasScore ? smooth.score + (result.pose_similarity - smooth.score) * 0.12 : result.pose_similarity
        smooth.hasScore = true
      } else {
        smooth.hasScore = false
      }
      smooth.progress += (hold.progress - smooth.progress) * 0.2
      if (Math.abs(hold.progress - smooth.progress) < 0.004) smooth.progress = hold.progress

      const next: Hud = {
        message: result ? result.message : MESSAGES.NOT_ENOUGH_JOINTS,
        score: smooth.hasScore ? Math.round(smooth.score * 10) / 10 : null,
        progress: Math.round(smooth.progress * 200) / 200,
      }
      const prev = hudRef.current
      if (prev.message === next.message && prev.score === next.score && prev.progress === next.progress) return
      hudRef.current = next
      setHud(next)
    }

    const shutter = (lm: PoseLandmarks, result: EvaluateResult, multiPerson: boolean) => {
      const video = videoRef.current
      if (!video) return
      // 서버가 400으로 거부할 좌표(화면 밖으로 잘린 부위)는 업로드 전에 걸러서 재촬영 유도
      if (findOutOfRangeLandmark(lm) !== null) {
        capturedRef.current = false
        setPhase({ kind: 'rejected', message: '몸 일부가 화면 밖으로 잘렸어요. 레퍼런스에 나온 부위가 다 보이게 서주세요.' })
        return
      }
      // 크기 기준(TORSO/HIP_KNEE)이 레퍼런스와 다르면 서버가 SCALE_BASIS_MISMATCH로 거부한다.
      if (chooseScaleBasis(lm) !== refScaleBasis) {
        capturedRef.current = false
        setPhase({ kind: 'rejected', message: '레퍼런스와 같은 부위가 나오도록 서주세요.' })
        return
      }
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      canvas.getContext('2d')?.drawImage(video, 0, 0) // 비반전 원본 — 거울은 미리보기 CSS뿐
      canvas.toBlob((blob) => {
        if (!blob || cancelled) {
          capturedRef.current = false
          return
        }
        if (payloadRef.current) URL.revokeObjectURL(payloadRef.current.url)
        const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' })
        const payload: CapturePayload = { file, url: URL.createObjectURL(file), lm, result, multiPerson }
        payloadRef.current = payload
        void uploadCapture(payload)
      }, 'image/jpeg', 0.9)
    }

    ;(async () => {
      // 카메라 먼저 — 권한 프롬프트가 바로 뜨고, 실패 원인도 구분해 안내한다.
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: 960, height: 1280, facingMode: 'user' } })
      } catch (error) {
        if (!cancelled) setPhase({ kind: 'camera-error', message: cameraErrorMessage(error) })
        return
      }
      if (cancelled) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }
      streamRef.current = stream

      let videoLandmarker: Awaited<ReturnType<typeof loadVideoLandmarker>>
      try {
        videoLandmarker = await loadVideoLandmarker()
      } catch {
        if (!cancelled) setPhase({ kind: 'camera-error', message: '자세 인식 모듈을 불러오지 못했어요. 네트워크 연결을 확인하고 다시 시도해주세요.' })
        return
      }

      try {
        const video = videoRef.current
        if (!video) return
        video.srcObject = stream
        await video.play()
        if (cancelled) return
        setPhase({ kind: 'live' })

        const tick = () => {
          if (cancelled) return
          if (video.readyState >= 2 && phaseRef.current === 'live') {
            const res = videoLandmarker.detectForVideo(video, performance.now())
            const liveLm = (res.landmarks[0] as PoseLandmarks | undefined) ?? null
            if (liveLm) {
              const multiPerson = res.landmarks.length > 1
              const result = evaluate(refLm, liveLm, criteria, {
                multiPerson,
                refAspect,
                userAspect: video.videoWidth / video.videoHeight,
              })
              updateHud(result)
              if (hold(result.pass) && !capturedRef.current) {
                capturedRef.current = true
                shutter(liveLm, result, multiPerson)
              }
            } else {
              hold(false)
              updateHud(null)
            }
          }
          raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
      } catch {
        if (!cancelled) {
          setPhase({ kind: 'camera-error', message: '카메라 화면을 시작하지 못했어요. 다시 시도해주세요.' })
        }
      }
    })()

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [criteria, refAspect, refLm, refScaleBasis, setPhase, uploadCapture, initNonce])

  useEffect(() => () => {
    if (payloadRef.current) URL.revokeObjectURL(payloadRef.current.url)
  }, [])

  const retryCamera = () => {
    setPhase({ kind: 'starting' })
    setInitNonce(nonce => nonce + 1)
  }

  const retake = () => {
    capturedRef.current = false
    setPhase({ kind: 'live' })
  }

  const retrySamePhoto = () => {
    const payload = payloadRef.current
    if (payload) void uploadCapture(payload)
  }

  const capturedUrl = payloadRef.current?.url ?? null
  const showOverlay = phase.kind !== 'live' && phase.kind !== 'starting'

  return <FixedStepFrame label="Step 2 실시간 자세 촬영"><div className="pose-page">
    <p className="step-label">Step 2/3</p>
    <h1>실시간 자세 촬영</h1>
    <p className="step-description">레퍼런스와 같은 포즈를 유지하면 자동으로 촬영됩니다</p>

    <div className="pose-reference pose-reference--live">
      <img ref={refImageRef} src={referenceUrl} alt="레퍼런스 체형" onLoad={drawReferenceSkeleton} />
      <canvas ref={skeletonRef} className="pose-reference__skeleton" aria-hidden="true" />
    </div>
    <ul className="pose-guide" aria-label="촬영 안내">
      {CAPTURE_GUIDES.map((guide) => <li key={guide}>{guide}</li>)}
    </ul>

    <div className="pose-live-area">
      {/* 거울 미리보기는 CSS 반전만 — 좌표·캡처는 비반전 원본 */}
      <video ref={videoRef} className="pose-live-video" playsInline muted />
      {phase.kind === 'starting' && <p className="pose-live-starting">카메라를 준비하고 있어요…</p>}
      {phase.kind === 'live' && <>
        <p className="pose-live-message" aria-live="polite">{hud.message}</p>
        <div className="pose-live-hold" role="progressbar" aria-label="자동 촬영 진행" aria-valuemin={0} aria-valuemax={1} aria-valuenow={Math.round(hud.progress * 100) / 100}>
          <span style={{ width: `${Math.round(hud.progress * 100)}%` }} />
        </div>
      </>}
      {showOverlay && <div className="pose-live-overlay">
        {capturedUrl && phase.kind !== 'camera-error' && <img className="pose-live-capture" src={capturedUrl} alt="촬영된 사진" />}
        {phase.kind === 'uploading' && <p className="pose-live-overlay__text">사진을 확인하고 있어요…</p>}
        {phase.kind === 'camera-error' && <>
          <p className="pose-live-overlay__text">{phase.message}</p>
          <button className="pose-live-overlay__retry" type="button" onClick={retryCamera}>다시 시도</button>
        </>}
      </div>}
    </div>
    <img className="pose-corner pose-corner--top-left" src={poseCornerTopLeft} alt="" />
    <img className="pose-corner pose-corner--top-right" src={poseCornerTopRight} alt="" />
    <img className="pose-corner pose-corner--bottom-left" src={poseCornerBottomLeft} alt="" />
    <img className="pose-corner pose-corner--bottom-right" src={poseCornerBottomRight} alt="" />

    <input ref={fileInputRef} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp,image/heic"
      onChange={event => { const file = event.currentTarget.files?.[0]; if (file) onBrowse(file); event.currentTarget.value = '' }} />
    {(phase.kind === 'live' || phase.kind === 'camera-error') && <button className="pose-gallery" type="button" onClick={() => fileInputRef.current?.click()}>갤러리에서 업로드</button>}

    {hud.score !== null && phase.kind === 'live' && <div className="pose-score" aria-label={`일치도 ${hud.score}점`}>
      <img src={poseScoreRing} alt="" />
      <img src={poseScoreArc} alt="" />
      <strong>{hud.score.toFixed(1)} <small>점</small></strong>
    </div>}

    {phase.kind === 'done' && <>
      <div className="pose-status pose-status--success">
        <span className="pose-status__symbol"><img src={poseSuccessCheck} alt="" /></span>
        <strong>사진이 업로드 되었습니다!</strong>
        <small>다음 단계로 넘어가세요</small>
      </div>
      <button className="pose-next" type="button" onClick={onNext}>다음 단계</button>
    </>}

    {phase.kind === 'rejected' && <div className="pose-status pose-status--failure">
      <span className="pose-status__symbol"><img src={poseFailLineOne} alt="" /><img src={poseFailLineTwo} alt="" /></span>
      <strong>{phase.message}</strong>
      <small>같은 포즈로 다시 촬영해주세요</small>
      <button type="button" onClick={retake}>다시 찍기</button>
    </div>}

    {phase.kind === 'retry' && <div className="pose-status pose-status--failure pose-status--retry">
      <span className="pose-status__symbol"><img src={poseFailLineOne} alt="" /><img src={poseFailLineTwo} alt="" /></span>
      <strong>{phase.message}</strong>
      <small>사진은 문제없어요 — 다시 찍지 않아도 됩니다</small>
      <button type="button" onClick={retrySamePhoto}>다시 시도</button>
    </div>}
  </div></FixedStepFrame>
}
