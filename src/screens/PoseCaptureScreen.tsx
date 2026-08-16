import { useCallback, useEffect, useRef, useState } from 'react'
import { FixedStepFrame } from '../components/FixedStepFrame'
import { createHoldGate, evaluate, MESSAGES, type EvaluateResult, type PoseCriteria, type PoseLandmarks } from '../lib/pose-score.js'
import { loadLandmarkers } from '../lib/landmarkers'
import { ApiError, uploadUserPhoto } from '../lib/api'
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
  userId: string
  sessionId: string
  criteria: PoseCriteria
  refLm: PoseLandmarks
  refAspect: number
  referenceUrl: string
  onNext: () => void
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
  blob: Blob
  url: string
  lm: PoseLandmarks
  scores: { pose_similarity: number; framing_score: number; facing_delta: number; multi_person: boolean }
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

export function PoseCaptureScreen({ userId, sessionId, criteria, refLm, refAspect, referenceUrl, onNext }: PoseCaptureScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const capturedRef = useRef(false)
  const payloadRef = useRef<CapturePayload | null>(null)
  const phaseRef = useRef<Phase['kind']>('starting')
  const hudRef = useRef<Hud>({ message: '', score: null, progress: 0 })

  const [phase, setPhaseState] = useState<Phase>({ kind: 'starting' })
  const [hud, setHud] = useState<Hud>({ message: '카메라를 준비하고 있어요…', score: null, progress: 0 })

  const setPhase = useCallback((next: Phase) => {
    phaseRef.current = next.kind
    setPhaseState(next)
  }, [])

  const uploadCapture = useCallback(async (payload: CapturePayload) => {
    setPhase({ kind: 'uploading' })
    try {
      await uploadUserPhoto(userId, sessionId, payload.blob, payload.lm, payload.scores, 'CAPTURE')
      setPhase({ kind: 'done' })
    } catch (error) {
      if (error instanceof ApiError && error.status === 503) {
        setPhase({ kind: 'retry', message: RETRY_MESSAGE })
      } else if (error instanceof ApiError) {
        setPhase({ kind: 'rejected', message: error.message })
      } else {
        setPhase({ kind: 'retry', message: RETRY_MESSAGE })
      }
    }
  }, [sessionId, setPhase, userId])

  useEffect(() => {
    let cancelled = false
    let raf = 0
    const hold = createHoldGate(criteria)

    const updateHud = (result: EvaluateResult | null) => {
      const next: Hud = {
        message: result ? result.message : MESSAGES.NOT_ENOUGH_JOINTS,
        score: result ? result.pose_similarity : null,
        progress: hold.progress,
      }
      const prev = hudRef.current
      if (prev.message === next.message && prev.score === next.score && Math.abs(prev.progress - next.progress) < 0.02) return
      hudRef.current = next
      setHud(next)
    }

    const shutter = (lm: PoseLandmarks, result: EvaluateResult, multiPerson: boolean) => {
      const video = videoRef.current
      if (!video) return
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
        const payload: CapturePayload = {
          blob,
          url: URL.createObjectURL(blob),
          lm,
          scores: {
            pose_similarity: result.pose_similarity,
            framing_score: result.framing_score,
            facing_delta: result.facing_delta,
            multi_person: multiPerson,
          },
        }
        payloadRef.current = payload
        void uploadCapture(payload)
      }, 'image/jpeg', 0.9)
    }

    ;(async () => {
      try {
        const [{ video: videoLandmarker }, stream] = await Promise.all([
          loadLandmarkers(),
          navigator.mediaDevices.getUserMedia({ video: { width: 960, height: 1280, facingMode: 'user' } }),
        ])
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        streamRef.current = stream
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
          setPhase({ kind: 'camera-error', message: '카메라를 열 수 없어요. 브라우저 카메라 권한을 허용해주세요.' })
        }
      }
    })()

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      streamRef.current?.getTracks().forEach((track) => track.stop())
      if (payloadRef.current) URL.revokeObjectURL(payloadRef.current.url)
    }
  }, [criteria, refAspect, refLm, setPhase, uploadCapture])

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

    <div className="pose-reference pose-reference--live"><img src={referenceUrl} alt="레퍼런스 체형" /></div>
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
        {phase.kind === 'camera-error' && <p className="pose-live-overlay__text">{phase.message}</p>}
      </div>}
    </div>
    <img className="pose-corner pose-corner--top-left" src={poseCornerTopLeft} alt="" />
    <img className="pose-corner pose-corner--top-right" src={poseCornerTopRight} alt="" />
    <img className="pose-corner pose-corner--bottom-left" src={poseCornerBottomLeft} alt="" />
    <img className="pose-corner pose-corner--bottom-right" src={poseCornerBottomRight} alt="" />

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
