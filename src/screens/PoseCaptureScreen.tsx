import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FixedStepFrame } from '../components/FixedStepFrame'
import { PreviousButton } from '../components/PreviousButton'
import { PoseScore } from '../components/PoseScore'
import { createHoldGate, evaluate, IDX, MESSAGES, mirrorLandmarks, SEGMENTS, type EvaluateResult, type PoseCriteria, type PoseLandmarks } from '../lib/pose-score.js'
import { loadVideoLandmarker } from '../lib/landmarkers'
import { areaRatio, chooseScaleBasis, findOutOfRangeLandmark } from '../lib/pose-detector'
import { RefitApiError, setStoredAnalysisMode, uploadUserPhoto, userFacingMessage } from '../lib/api'
import poseCornerTopLeft from '../assets/pose-corner-top-left.svg'
import poseCornerTopRight from '../assets/pose-corner-top-right.svg'
import poseCornerBottomLeft from '../assets/pose-corner-bottom-left.svg'
import poseCornerBottomRight from '../assets/pose-corner-bottom-right.svg'
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
  onPrevious: () => void
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

// 촬영 안내 — 근거는 백엔드 docs/FRONTEND.md 와 2차 검사 프롬프트(photo_screening.py).
// ⚠️ "머리부터 발까지"는 틀렸다 — 머리·발끝이 잘려도 통과하고, 전신을 다 넣으려 멀리 서면
//    사람이 작게 나와 부위별 픽셀이 오히려 부족해진다.
// ⚠️ "팔을 15~30도 벌리기"도 여기 둘 문구가 아니다 — 사용자는 레퍼런스 포즈를 따라야 하고
//    (안 따르면 자세 점수 미달), 팔이 붙은 레퍼런스면 그 팔은 레퍼런스 쪽에서 이미 검출되지
//    않아 양쪽 다 비교에서 빠진다. 팔 벌림은 **레퍼런스를 고를 때** 필요한 조건이다.
const CAPTURE_GUIDES = [
  '레퍼런스를 화면에 보이는 대로 따라 하세요',
  '발끝까지 안 나와도 괜찮아요 — 몸통과 팔다리만 보이면 됩니다',
  '카메라와 적당한 거리를 두세요 — 너무 멀면 인식이 어려워요',
  '맨살이나 몸에 붙는 옷으로 — 옷이 헐렁하면 팔다리 윤곽이 가려져요',
  '배경이 단순한 곳에서 촬영해 주세요',
]

const RETRY_MESSAGE = '일시적인 문제로 사진을 확인하지 못했어요. 잠시 후 다시 시도해주세요.'

/**
 * 관절 스켈레톤을 letterbox(contain) 보정해서 그린다 (web/pose-live.html 참고).
 * 판정에 쓰는 8개 부위 선 + 몸통 중심선, 가려진 관절은 흐리고 작게.
 */
function drawSkeletonOn(canvas: HTMLCanvasElement | null, lm: PoseLandmarks | null, mediaW: number, mediaH: number, minVisibility: number) {
  const box = canvas?.parentElement
  if (!canvas || !box) return
  const cw = box.clientWidth
  const ch = box.clientHeight
  if (!(cw > 0 && ch > 0)) return
  if (canvas.width !== cw) canvas.width = cw
  if (canvas.height !== ch) canvas.height = ch
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, cw, ch)
  if (!lm || !(mediaW > 0 && mediaH > 0)) return

  const scale = Math.min(cw / mediaW, ch / mediaH)
  const dw = mediaW * scale
  const dh = mediaH * scale
  const ox = (cw - dw) / 2
  const oy = (ch - dh) / 2
  const X = (p: { x: number }) => ox + p.x * dw
  const Y = (p: { y: number }) => oy + p.y * dh

  ctx.strokeStyle = '#ffe250'
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  for (const [, a, b] of SEGMENTS) {
    if (!lm[a] || !lm[b]) continue
    ctx.beginPath()
    ctx.moveTo(X(lm[a]), Y(lm[a]))
    ctx.lineTo(X(lm[b]), Y(lm[b]))
    ctx.stroke()
  }
  const sl = lm[IDX.shoulderL], sr = lm[IDX.shoulderR], hl = lm[IDX.hipL], hr = lm[IDX.hipR]
  if (sl && sr && hl && hr) {
    ctx.beginPath()
    ctx.moveTo((X(sl) + X(sr)) / 2, (Y(sl) + Y(sr)) / 2)
    ctx.lineTo((X(hl) + X(hr)) / 2, (Y(hl) + Y(hr)) / 2)
    ctx.stroke()
  }
  // 가려진 관절은 MediaPipe 추측값 — 흐리고 작게 그려서 추측임을 알 수 있게 한다.
  for (const i of Object.values(IDX)) {
    const p = lm[i]
    if (!p) continue
    const visibility = typeof p.visibility === 'number' ? p.visibility : 1
    const weak = visibility < minVisibility
    ctx.fillStyle = weak ? 'rgba(246, 246, 246, .3)' : '#f6f6f6'
    ctx.beginPath()
    ctx.arc(X(p), Y(p), weak ? 2.5 : 4, 0, Math.PI * 2)
    ctx.fill()
  }
}

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

export function PoseCaptureScreen({ sessionId, criteria, refLm, refAspect, refScaleBasis, referenceUrl, onNext, onPrevious, onBrowse }: PoseCaptureScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const refImageRef = useRef<HTMLImageElement>(null)
  const skeletonRef = useRef<HTMLCanvasElement>(null)
  const liveSkeletonRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const capturedRef = useRef(false)
  const payloadRef = useRef<CapturePayload | null>(null)
  const phaseRef = useRef<Phase['kind']>('starting')
  const hudRef = useRef<Hud>({ message: '', score: null, progress: 0 })

  const [phase, setPhaseState] = useState<Phase>({ kind: 'starting' })
  const [hud, setHud] = useState<Hud>({ message: '카메라를 준비하고 있어요…', score: null, progress: 0 })
  const [initNonce, setInitNonce] = useState(0)
  /** 자세 유지가 확인된 뒤 몇 초 남았는지 — 갑자기 찍히지 않게 예고한다. */
  const [countdown, setCountdown] = useState<number | null>(null)

  // 판정 방향 = 사진 방향 (FRONTEND.md §7, 2026-08-18 개정): 프리뷰가 거울이고
  // 촬영본도 거울 방향으로 저장하므로, 판정 기준 레퍼런스를 좌우반전해 채점한다 —
  // 화면에 보이는 대로 따라 하면 통과하고, 저장 이후는 업로드와 완전히 같은 기준.
  const mirroredRefLm = useMemo(() => mirrorLandmarks(refLm), [refLm])

  const setPhase = useCallback((next: Phase) => {
    phaseRef.current = next.kind
    setPhaseState(next)
  }, [])

  const drawReferenceSkeleton = useCallback(() => {
    const image = refImageRef.current
    if (!image) return
    drawSkeletonOn(skeletonRef.current, refLm, image.naturalWidth, image.naturalHeight, criteria.min_visibility)
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
        // 웹캠 경로 = 퀵 파이프라인. 서버가 세그 잡을 걸지 않는다(Sapiens2 미사용) —
        // 분석 시작도 mode=quick 이어야 하므로 업로드 성공과 같은 순간에 모드를 기록한다.
        pipeline: 'quick',
      })
      setStoredAnalysisMode('quick')
      setPhase({ kind: 'done' })
    } catch (error) {
      if (error instanceof RefitApiError && error.status === 503) {
        setPhase({ kind: 'retry', message: RETRY_MESSAGE })
      } else if (error instanceof RefitApiError) {
        setPhase({ kind: 'rejected', message: userFacingMessage(error, '사진을 처리하지 못했어요. 같은 포즈로 다시 촬영해 주세요.') })
      } else {
        setPhase({ kind: 'retry', message: RETRY_MESSAGE })
      }
    }
  }, [sessionId, setPhase])

  useEffect(() => {
    let cancelled = false
    let raf = 0
    const hold = createHoldGate(criteria)
    // 카운트다운 상태 — 게이지가 다 차면 바로 찍지 않고 3초 예고 후 촬영한다.
    // 그 사이 자세가 흐트러지면(연속 실패) 취소하고 다시 게이지부터 쌓는다.
    const COUNTDOWN_MS = 3000
    const CANCEL_AFTER_FAILS = 8
    let pending: { endsAt: number; failStreak: number } | null = null
    let lastPass: { lm: PoseLandmarks; result: EvaluateResult; multiPerson: boolean } | null = null
    setCountdown(null)

    // 점수는 최신 인식 결과를 즉시 보여준다. 과도한 평활화는 점수와 초록 링이
    // 실제 자세보다 늦게 따라오는 원인이 되어 실시간 피드백을 어렵게 한다.
    const smooth = { score: 0, hasScore: false, progress: 0 }
    const updateHud = (result: EvaluateResult | null, messageOverride?: string) => {
      if (result) {
        smooth.score = result.pose_similarity
        smooth.hasScore = true
      } else {
        smooth.hasScore = false
      }
      smooth.progress += (hold.progress - smooth.progress) * 0.2
      if (Math.abs(hold.progress - smooth.progress) < 0.004) smooth.progress = hold.progress

      const next: Hud = {
        message: messageOverride ?? (result ? result.message : MESSAGES.NOT_ENOUGH_JOINTS),
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
      // 서버 ±10 검증과 같은 안전망 — 걸리면 좌표 단위 버그이므로 재촬영만 유도
      if (findOutOfRangeLandmark(lm) !== null) {
        capturedRef.current = false
        setPhase({ kind: 'rejected', message: '사진을 처리하지 못했어요. 다시 촬영해 주세요.' })
        return
      }
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      // 미리보기(거울) 방향 그대로 저장한다 (FRONTEND.md §7, 2026-08-18 개정).
      // 저장본이 레퍼런스와 같은 방향이 되므로 저장 이후 처리가 갤러리 업로드와
      // 완전히 같아진다 — 서버의 교차 짝짓기·표시 반전이 필요 없다.
      // ⚠️ 좌표도 아래에서 함께 반전한다. 사진과 좌표는 반드시 세트로 움직여야
      //    하고, 한쪽만 뒤집으면 에러 없이 좌우 진단이 통째로 어긋난다.
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.translate(canvas.width, 0)
        ctx.scale(-1, 1)
        ctx.drawImage(video, 0, 0)
      }
      canvas.toBlob((blob) => {
        if (!blob || cancelled) {
          capturedRef.current = false
          return
        }
        // 촬영 성공 — 카메라를 끄고 찍힌 사진만 보여준다 (다시 찍기에서 재시작)
        streamRef.current?.getTracks().forEach((track) => track.stop())
        streamRef.current = null
        if (videoRef.current) videoRef.current.srcObject = null
        if (payloadRef.current) URL.revokeObjectURL(payloadRef.current.url)
        const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' })
        const payload: CapturePayload = { file, url: URL.createObjectURL(file), lm: mirrorLandmarks(lm), result, multiPerson }
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
            drawSkeletonOn(liveSkeletonRef.current, liveLm, video.videoWidth, video.videoHeight, criteria.min_visibility)
            if (liveLm) {
              const multiPerson = res.landmarks.length > 1
              const result = evaluate(mirroredRefLm, liveLm, criteria, {
                multiPerson,
                refAspect,
                userAspect: video.videoWidth / video.videoHeight,
              })
              // 크기 기준(TORSO/HIP_KNEE)이 레퍼런스와 다르면 서버가 거부하므로
              // 셔터 조건에서 빼고, 문구로 즉시 안내한다 (게이지가 차지 않는 이유가 보이게).
              const basisMismatch = chooseScaleBasis(liveLm) !== refScaleBasis
              const ok = result.pass && !basisMismatch
              if (ok) lastPass = { lm: liveLm, result, multiPerson }

              if (pending === null) {
                updateHud(result, basisMismatch && result.pass ? '레퍼런스와 같은 부위가 나오도록 서주세요.' : undefined)
                if (hold(ok) && !capturedRef.current) {
                  pending = { endsAt: performance.now() + COUNTDOWN_MS, failStreak: 0 }
                  setCountdown(Math.ceil(COUNTDOWN_MS / 1000))
                }
              } else {
                updateHud(result, '곧 촬영됩니다 — 자세를 유지해주세요')
                pending.failStreak = ok ? 0 : pending.failStreak + 1
                if (pending.failStreak > CANCEL_AFTER_FAILS) {
                  pending = null // 자세가 흐트러짐 — 취소하고 다시 게이지부터
                  setCountdown(null)
                } else if (performance.now() >= pending.endsAt) {
                  pending = null
                  setCountdown(null)
                  if (lastPass && !capturedRef.current) {
                    capturedRef.current = true
                    shutter(lastPass.lm, lastPass.result, lastPass.multiPerson)
                  }
                } else {
                  const remain = Math.ceil((pending.endsAt - performance.now()) / 1000)
                  setCountdown(prev => (prev === remain ? prev : remain))
                }
              }
            } else {
              hold(false)
              updateHud(null)
              if (pending) {
                pending = null // 사람이 사라짐 — 카운트다운 취소
                setCountdown(null)
              }
            }
          } else if (phaseRef.current !== 'live') {
            // 촬영/업로드 상태에서는 마지막 프레임의 스켈레톤이 남지 않게 지운다
            drawSkeletonOn(liveSkeletonRef.current, null, 0, 0, criteria.min_visibility)
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
  }, [criteria, refAspect, mirroredRefLm, refScaleBasis, setPhase, uploadCapture, initNonce])

  useEffect(() => () => {
    if (payloadRef.current) URL.revokeObjectURL(payloadRef.current.url)
  }, [])

  const retryCamera = () => {
    setPhase({ kind: 'starting' })
    setInitNonce(nonce => nonce + 1)
  }

  const retake = () => {
    // 촬영 때 카메라를 껐으므로 처음부터 다시 연다
    capturedRef.current = false
    setPhase({ kind: 'starting' })
    setInitNonce(nonce => nonce + 1)
  }

  const retrySamePhoto = () => {
    const payload = payloadRef.current
    if (payload) void uploadCapture(payload)
  }

  const capturedUrl = payloadRef.current?.url ?? null
  const showOverlay = phase.kind !== 'live' && phase.kind !== 'starting'

  return <FixedStepFrame label="Step 2 실시간 자세 촬영"><div className="pose-page">
    <PreviousButton onClick={onPrevious} />
    <p className="step-label">Step 2/3</p>
    <h1>실시간 자세 촬영</h1>
    <p className="step-description">레퍼런스와 같은 포즈를 유지하면 자동으로 촬영됩니다.</p>

    <div className="pose-reference pose-reference--live">
      <img ref={refImageRef} src={referenceUrl} alt="레퍼런스 체형" onLoad={drawReferenceSkeleton} />
      <canvas ref={skeletonRef} className="pose-reference__skeleton" aria-hidden="true" />
    </div>
    <section className="pose-guide-card" aria-labelledby="pose-guide-title">
      <h2 id="pose-guide-title">촬영 가이드</h2>
      <ul className="pose-guide">
        {CAPTURE_GUIDES.map((guide, index) => <li key={guide}><span>{index + 1}</span>{guide}</li>)}
      </ul>
    </section>

    <div className="pose-live-area">
      {/* 미리보기·스켈레톤은 CSS 반전으로 거울처럼 보여준다. 판정에 쓰는 좌표는 카메라 원본이고,
          저장은 셔터에서 사진·좌표를 함께 반전해 화면에서 본 방향으로 남긴다 (shutter 주석 참고) */}
      <video ref={videoRef} className="pose-live-video" playsInline muted />
      <canvas ref={liveSkeletonRef} className="pose-live-skeleton" aria-hidden="true" />
      {phase.kind === 'starting' && <p className="pose-live-starting">카메라를 준비하고 있어요…</p>}
      {phase.kind === 'live' && <>
        {countdown !== null && <span className="pose-live-countdown" aria-live="assertive">{countdown}</span>}
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

    <input ref={fileInputRef} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp"
      onChange={event => { const file = event.currentTarget.files?.[0]; if (file) onBrowse(file); event.currentTarget.value = '' }} />
    {(phase.kind === 'live' || phase.kind === 'camera-error') && <button className="pose-gallery" type="button" onClick={() => fileInputRef.current?.click()}>갤러리에서 업로드</button>}

    {hud.score !== null && phase.kind === 'live' && <PoseScore score={hud.score} />}

    {phase.kind === 'done' && <>
      <div className="pose-status pose-status--success">
        <span className="pose-status__symbol"><img src={poseSuccessCheck} alt="" /></span>
        <strong>사진이 업로드되었습니다!</strong>
        <small>다음 단계로 넘어가세요</small>
      </div>
      <button className="pose-next" type="button" onClick={onNext}>다음 단계</button>
    </>}

    {phase.kind === 'rejected' && <div className="pose-status pose-status--failure">
      <span className="pose-status__symbol"><img src={poseFailLineOne} alt="" /><img src={poseFailLineTwo} alt="" /></span>
      <strong>{phase.message}</strong>
      <small>같은 포즈로 다시 촬영해 주세요</small>
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
