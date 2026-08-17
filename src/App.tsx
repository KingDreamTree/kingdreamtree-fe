import { useEffect, useRef, useState, type ReactNode } from 'react'
import heroBackground from './assets/onboarding-hero-background-figma.png'
import heroPhone from './assets/onboarding-hero-phone.png'
import onboardingScrollCue from './assets/onboarding-scroll-cue.svg'
import routineFigure from './assets/routine-figure.png'
import routineMarker from './assets/routine-marker.svg'
import routinePlatform from './assets/routine-platform.svg'
import wellnessScreen from './assets/onboarding-wellness-screen.png'
import wellnessPlatform from './assets/onboarding-wellness-platform.svg'
import wellnessShadow from './assets/onboarding-wellness-shadow.svg'
import wellnessLaptop from './assets/onboarding-wellness-laptop.svg'
import wellnessOrbit from './assets/onboarding-wellness-orbit.svg'
import functionStepOne from './assets/onboarding-function-step-one.svg'
import functionStep from './assets/onboarding-function-step.svg'
import referenceInfo from './assets/reference-info.svg'
import referenceUpload from './assets/reference-upload.svg'
import referenceContrast from './assets/reference-contrast.svg'
import referenceResolution from './assets/reference-resolution.svg'
import referencePerson from './assets/reference-person.svg'
import referenceUploaded from './assets/reference-uploaded.svg'
import referenceUploadSuccessCheck from './assets/reference-upload-success-check.svg'
import poseCornerTopLeft from './assets/pose-corner-top-left.svg'
import poseCornerTopRight from './assets/pose-corner-top-right.svg'
import poseCornerBottomLeft from './assets/pose-corner-bottom-left.svg'
import poseCornerBottomRight from './assets/pose-corner-bottom-right.svg'
import poseSuccessCheck from './assets/pose-success-check.svg'
import poseFailLineOne from './assets/pose-fail-line-1.svg'
import poseFailLineTwo from './assets/pose-fail-line-2.svg'
import { FixedStepFrame } from './components/FixedStepFrame'
import { PoseScore } from './components/PoseScore'
import { PoseCaptureScreen } from './screens/PoseCaptureScreen'
import { applyCoachChanges, createRoutine, createWorkoutLog, getActiveRoutine, getAnalysis, getAnalysisProgress, getInbody, getJob, getPoseCriteria, getSessionSegmentation, getStoredSessionId, getTodayRoutine, patchInbody, RefitApiError, sendCoachMessage, startAnalysis, uploadInbody, uploadReferencePhoto, uploadUserPhoto, userFacingMessage, ensureActiveSession, type AnalysisResult, type CoachChatMessage, type CoachChatResponse, type InbodyDetail, type Job, type RoutineDay, type RoutineDetail, type SessionSegmentation, type TodayRoutine } from './lib/api'
import { detectPoseFromImage, type DetectedPose } from './lib/pose-detector'
import { loadVideoLandmarker } from './lib/landmarkers'
import { evaluate, MESSAGES, type PoseCriteria, type PoseEvaluation, type PoseLandmarks } from './lib/pose-score.js'

// 부분 신체(상체/하체만) 레퍼런스를 허용하므로 "전신이 보이도록"은 부정확하다.
// MESSAGES는 교체 가능하게 export되어 있고 evaluate()가 이 표를 그대로 읽는다.
MESSAGES.NOT_ENOUGH_JOINTS = '레퍼런스에 나온 부위가 보이도록 서주세요.'

const SCALE_BASIS_GUIDE = '레퍼런스와 같은 부위가 나오도록 촬영해주세요. 계속 어려우면 레퍼런스를 다시 등록해주세요.'
import { InbodyUploadAfterScreen, type InbodyPatch } from './screens/InbodyUploadAfterScreen'
import { InbodyUploadBeforeScreen } from './screens/InbodyUploadBeforeScreen'
import { InbodyUploadSuccessScreen } from './screens/InbodyUploadSuccessScreen'
import { InbodyRangeErrorScreen } from './screens/InbodyRangeErrorScreen'
import { InbodyValidationWarningScreen } from './screens/InbodyValidationWarningScreen'
import { InbodyAllErrorsFixedScreen } from './screens/InbodyAllErrorsFixedScreen'
import { InbodyUnreadableScreen } from './screens/InbodyUnreadableScreen'
import { LoadingOneScreen } from './screens/LoadingOneScreen'
import { ComparisonAnalysisScreen } from './screens/ComparisonAnalysisScreen'
import { ExerciseDaysScreen } from './screens/ExerciseDaysScreen'
import { LoadingTwoScreen } from './screens/LoadingTwoScreen'
import { CustomRoutineScreen } from './screens/CustomRoutineScreen'
import { CustomRoutineDetailScreen } from './screens/CustomRoutineDetailScreen'
import { TodayRoutineScreen } from './screens/TodayRoutineScreen'
import { FeedbackScreen } from './screens/FeedbackScreen'
import { FeedbackLoadingScreen } from './screens/FeedbackLoadingScreen'
import { FeedbackAttentionAreaScreen } from './screens/FeedbackAttentionAreaScreen'
import { FeedbackExerciseIntensityScreen } from './screens/FeedbackExerciseIntensityScreen'
import { FeedbackReflectionScreen } from './screens/FeedbackReflectionScreen'
import { FeedbackAppliedScreen } from './screens/FeedbackAppliedScreen'
import { FeedbackKeptScreen } from './screens/FeedbackKeptScreen'
import './App.css'

type SectionProps = { children: ReactNode; className: string; label: string; scaleToViewport?: boolean; designHeight?: number }
type AppView = 'onboarding' | 'reference-notice' | 'reference' | 'pose-capture' | 'pose-analyzing' | 'pose-failure' | 'pose-unavailable' | 'pose-success' | 'inbody-upload' | 'inbody-uploaded' | 'inbody-form' | 'inbody-range-error' | 'inbody-warning' | 'inbody-fixed' | 'inbody-unreadable' | 'inbody-loading' | 'comparison' | 'exercise-days' | 'loading-two' | 'custom-routine' | 'custom-routine-detail' | 'today-routine' | 'feedback' | 'feedback-loading' | 'feedback-attention-area' | 'feedback-exercise-intensity' | 'feedback-reflection' | 'feedback-applied' | 'feedback-kept'

/** Reveals a design section once it reaches the viewport. */
function RevealSection({ children, className, label, scaleToViewport = false, designHeight = 1024 }: SectionProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [scale, setScale] = useState(() => Math.max(1, document.documentElement.clientWidth / 1440))

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      setIsVisible(true)
      observer.unobserve(entry.target)
    }, { threshold: 0.18 })
    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!scaleToViewport) return
    const updateScale = () => setScale(Math.max(1, document.documentElement.clientWidth / 1440))
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [scaleToViewport])

  const stageStyle = scaleToViewport ? { height: `${designHeight * scale}px` } : undefined
  const canvasStyle = scaleToViewport ? { transform: `scale(${scale})` } : undefined

  return <section ref={sectionRef} aria-label={label} className={`page-stage ${className}-stage ${scaleToViewport ? 'page-stage--scaled' : ''}`} style={stageStyle}>
    <div className={`page-section ${className} ${isVisible ? 'is-visible' : ''}`} style={canvasStyle}>{children}</div>
  </section>
}

function RefitLogo({ small = false, className = '' }: { small?: boolean; className?: string }) {
  return <p className={`logo ${small ? 'logo--small' : ''} ${className}`} aria-label="REFIT"><span>RE</span><span>:</span><strong>FIT</strong></p>
}

function StartButton({ wide = false, onStart }: { wide?: boolean; onStart: () => void }) {
  return <button className={`ai-button ${wide ? 'ai-button--wide' : ''}`} type="button" onClick={onStart}>AI 분석 진단하기</button>
}

function OnboardingOne() {
  return <RevealSection className="hero-section" label="REFIT 소개" scaleToViewport>
    <img className="hero-section__texture motion motion--soft" src={heroBackground} alt="" />
    <div className="hero-section__content">
      <div className="motion motion--delay-1"><RefitLogo /></div>
      <p className="hero-section__description motion motion--delay-2">원하는 체형의 사진을 선택하고, 나의 체형 정보를<br />입력하면 AI가 운동 루틴을 제공합니다.</p>
    </div>
    <div className="hero-section__scroll-cue motion motion--delay-3" aria-hidden="true"><img src={onboardingScrollCue} alt="" /><p>아래로 내려보세요</p></div>
    <div className="hero-section__character motion motion--from-right" aria-label="운동을 준비하는 인물">
      <div className="hero-section__character-window"><img src={heroPhone} alt="" /></div>
    </div>
  </RevealSection>
}

function OnboardingTwo() {
  return <RevealSection className="onboarding-wellness" label="온보딩 2: WELLNESS">
    <p className="onboarding-wellness__subtitle motion">리핏이 선사하는 특별한 경험</p>
    <h1 className="onboarding-wellness__title motion motion--delay-1">WELLNESS</h1>
    <img className="onboarding-wellness__orbit motion motion--delay-1" src={wellnessOrbit} alt="" />
    <div className="onboarding-wellness__computer motion motion--delay-2" aria-label="리핏 분석 화면이 표시된 노트북">
      <img className="onboarding-wellness__laptop" src={wellnessLaptop} alt="" />
      <img className="onboarding-wellness__screen" src={wellnessScreen} alt="" />
    </div>
    <img className="onboarding-wellness__platform motion motion--delay-3" src={wellnessPlatform} alt="" />
    <img className="onboarding-wellness__shadow motion motion--delay-3" src={wellnessShadow} alt="" />
  </RevealSection>
}

function OnboardingThree() {
  const cards = [
    { number: '1', icon: functionStepOne, title: 'AI 체형 분석', description: '체형과 목표 이미지 대조 및 차이 시각화' },
    { number: '2', icon: functionStep, title: '맞춤형 루틴', description: '결과를 바탕으로 나에게 맞는 루틴 생성' },
    { number: '3', icon: functionStep, title: '강도 조절', description: '날마다 피드백을 통해 바뀌는 루틴' },
  ]
  return <RevealSection className="onboarding-function" label="온보딩 3: 기능 소개">
    <p className="onboarding-function__subtitle motion">리핏만이 제공하는 기능</p>
    <h1 className="onboarding-function__title motion motion--delay-1">FUNCTION</h1>
    <div className="onboarding-function__cards">{cards.map((card, index) => <article className={`onboarding-function__card motion motion--delay-${index + 1}`} key={card.number}>
      <span className="onboarding-function__number"><img src={card.icon} alt="" /><b>{card.number}</b></span><h2>{card.title}</h2><p>{card.description}</p>
    </article>)}</div>
  </RevealSection>
}

function OnboardingFour({ onStart }: { onStart: () => void }) {
  return <RevealSection className="closing-section" label="온보딩 4: REFIT 시작하기">
    <RefitLogo small /><div className="closing-section__copy motion"><h1>AI가 만드는 <em>맞춤 루틴</em></h1><p>오늘부터 REFIT과 함께, 내가 바라는 건강함을 차곡차곡</p></div>
    <div className="closing-section__illustration motion motion--delay-1" aria-hidden="true"><img className="closing-section__platform" src={routinePlatform} alt="" /><img className="closing-section__figure" src={routineFigure} alt="" /><img className="closing-section__marker" src={routineMarker} alt="" /></div>
    <div className="closing-section__button motion motion--delay-2"><StartButton wide onStart={onStart} /></div>
  </RevealSection>
}

function ReferenceHints() {
  const hints = [
    { icon: referenceContrast, text: <>배경과 인물이 잘 구분되는<br />사진을 권장드려요</> },
    { icon: referenceResolution, text: <>저해상도 이미지는 분석<br />정확도가 낮아질 수 있어요</> },
    { icon: referencePerson, text: <>여러 명이 함께 나온<br />사진은 피해주세요</> },
  ]

  return <div className="reference-hints">{hints.map(({ icon, text }) => <div className="reference-hint" key={icon}>
    <span className="reference-hint__circle" aria-hidden="true" />
    <img src={icon} alt="" />
    <p>{text}</p>
  </div>)}</div>
}

type ReferenceScreenProps = {
  ready: boolean
  busy: boolean
  error: string | null
  showNotice: boolean
  onConfirm: () => void
  onSelectFile: (file: File) => void
  onStart: () => void
}

function ReferenceScreen({ ready, busy, error, showNotice, onConfirm, onSelectFile, onStart }: ReferenceScreenProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const pick = (files: FileList | null) => { const file = files?.[0]; if (file) onSelectFile(file) }
  return <FixedStepFrame label="Step 1 목표 체형 레퍼런스"><div className="reference-page">
      <p className="step-label">Step 1/3</p>
      <h1>목표 체형 레퍼런스</h1>
      <p className="step-description">원하는 체형의 사진을 등록하면 AI가 차이를 분석합니다</p>
      <ReferenceHints />
      <input ref={inputRef} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp,image/heic" onChange={event => { pick(event.currentTarget.files); event.currentTarget.value = '' }} />
      <button type="button" className={`reference-dropzone ${ready ? 'is-ready' : ''}`} disabled={busy}
        onClick={() => inputRef.current?.click()}
        onDragOver={event => event.preventDefault()}
        onDrop={event => { event.preventDefault(); pick(event.dataTransfer.files) }}>
        {busy
          ? <p>사진과 자세를 확인하고 있어요…</p>
          : ready
            ? <><img className="reference-dropzone__done" src={referenceUploaded} alt="" /><img className="reference-dropzone__check" src={referenceUploadSuccessCheck} alt="" /><strong>사진이 업로드 되었습니다!</strong><span>다른 사진으로 변경하려면 클릭하세요</span></>
            : <><img src={referenceUpload} alt="" /><p>파일을 선택하거나 여기로 끌어다 놓으세요.</p></>}
      </button>
      {error && <p className="reference-error" role="alert">{error}</p>}
      <button className={`reference-start ${ready ? 'is-ready' : ''}`} type="button" disabled={!ready || busy} onClick={onStart}>AI 분석 비교 시작 →</button>
      {showNotice && <section className="reference-notice" role="dialog" aria-modal="true" aria-labelledby="reference-notice-title">
        <span className="reference-notice__icon"><img src={referenceInfo} alt="" /></span>
        <h2 id="reference-notice-title">레퍼런스 주의사항 안내</h2>
        <p>해당 레퍼런스 이미지에 있는 부위에 대한 루틴만 제공되오니<br />신중하게 업로드해주시길 바랍니다.</p>
        <button type="button" onClick={onConfirm}>확인</button>
      </section>}
  </div></FixedStepFrame>
}

function PoseCorners() {
  return <><img className="pose-corner pose-corner--top-left" src={poseCornerTopLeft} alt="" /><img className="pose-corner pose-corner--top-right" src={poseCornerTopRight} alt="" /><img className="pose-corner pose-corner--bottom-left" src={poseCornerBottomLeft} alt="" /><img className="pose-corner pose-corner--bottom-right" src={poseCornerBottomRight} alt="" /></>
}


function PoseStatus({ result, message, onRetry, onBrowse }: { result: 'loading' | 'failure' | 'success' | 'unavailable'; message?: string; onRetry: () => void; onBrowse: () => void }) {
  if (result === 'loading') return <div className="pose-status pose-status--loading" aria-live="polite"><span className="loading-dot">•</span><span className="loading-dot">•</span><span className="loading-dot">•</span><p>AI가 일치도를 분석하고 있어요!</p><small>사진을 업로드하려면 클릭하세요</small><button type="button" onClick={onBrowse}>Browse File</button></div>
  const success = result === 'success'
  const unavailable = result === 'unavailable'
  return <div className={`pose-status pose-status--${success ? 'success' : 'failure'}`}>
    <span className="pose-status__symbol">{success ? <img src={poseSuccessCheck} alt="" /> : <><img src={poseFailLineOne} alt="" /><img src={poseFailLineTwo} alt="" /></>}</span>
    <strong>{success ? '사진이 업로드 되었습니다!' : message || (unavailable ? '사진 확인을 잠시 진행할 수 없어요.' : '레퍼런스의 포즈와 일치하지 않아요!')}</strong>
    <small>{success ? '다음 단계로 넘어가세요' : unavailable ? '같은 사진으로 잠시 후 다시 시도해주세요' : '다시 업로드 해주세요'}</small>
    {success ? null : <button type="button" onClick={unavailable ? onRetry : onBrowse}>{unavailable ? '다시 시도' : 'Browse File'}</button>}
  </div>
}

type PoseScreenProps = {
  result: 'loading' | 'failure' | 'success' | 'unavailable'
  score: number
  message?: string
  referenceUrl: string | null
  onRetry: () => void
  onBrowse: (file: File) => void
  onLive: () => void
  onNext: () => void
}

function PoseScreen({ result, score, message, referenceUrl, onRetry, onBrowse, onLive, onNext }: PoseScreenProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  return <FixedStepFrame label={`Step 2 체형 사진 ${result}`}><div className="pose-page">
      <p className="step-label">Step 2/3</p>
      <h1>체형 사진 업로드</h1>
      <p className="step-description">레퍼런스와 같은 포즈로 자신의 체형을 업로드 해주세요!</p>
      {referenceUrl && <div className="pose-reference pose-reference--live"><img src={referenceUrl} alt="레퍼런스 체형" /></div>}
      <PoseCorners />
      <input ref={inputRef} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp,image/heic" onChange={event => { const file = event.currentTarget.files?.[0]; if (file) onBrowse(file); event.currentTarget.value = '' }} />
      <PoseScore score={score} />
      {result === 'success'
        ? <button className="pose-next" type="button" onClick={onNext}>다음 단계</button>
        : <button className="pose-gallery" type="button" onClick={onLive}>실시간 촬영으로</button>}
      <PoseStatus result={result} message={message} onRetry={onRetry} onBrowse={() => inputRef.current?.click()} />
  </div></FixedStepFrame>
}

type ReferenceData = { pose: DetectedPose; url: string; aspect: number }

function getJobId(value: Record<string, unknown>): string | null {
  return typeof value.job_id === 'string' ? value.job_id : null
}

async function waitForJob(jobId: string): Promise<Job> {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const job = await getJob(jobId)
    if (job.status === 'DONE') return job
    if (job.status === 'FAILED') throw new Error(job.error || 'The requested job failed.')
    await new Promise(resolve => window.setTimeout(resolve, 1500))
  }
  throw new Error('The requested job timed out.')
}

function App() {
  const [view, setView] = useState<AppView>('onboarding')
  const [workoutDays, setWorkoutDays] = useState(1)
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [isPreparingSession, setIsPreparingSession] = useState(false)
  const [criteria, setCriteria] = useState<PoseCriteria | null>(null)
  const [refData, setRefData] = useState<ReferenceData | null>(null)
  const [refBusy, setRefBusy] = useState(false)
  const [refError, setRefError] = useState<string | null>(null)
  const [lastUserPhoto, setLastUserPhoto] = useState<File | null>(null)
  const [poseEvaluation, setPoseEvaluation] = useState<PoseEvaluation | null>(null)
  const [poseMessage, setPoseMessage] = useState<string>()
  const inbodyFileInputRef = useRef<HTMLInputElement>(null)
  const [inbodyId, setInbodyId] = useState<string | null>(null)
  const [inbodyJobId, setInbodyJobId] = useState<string | null>(null)
  const [inbodyData, setInbodyData] = useState<InbodyDetail | null>(null)
  const [todayRoutine, setTodayRoutine] = useState<TodayRoutine | null>(null)
  const [analysisData, setAnalysisData] = useState<AnalysisResult | null>(null)
  const [segmentationData, setSegmentationData] = useState<SessionSegmentation | null>(null)
  const [routineData, setRoutineData] = useState<RoutineDetail | null>(null)
  const [selectedDay, setSelectedDay] = useState<RoutineDay | null>(null)
  const [coach, setCoach] = useState<CoachChatResponse | null>(null)

  // 세션과 판정 기준(GET /pose-criteria)은 시작 시 한 번만. 모델·wasm도 미리 로드.
  const openReference = async () => {
    if (isPreparingSession) return
    setIsPreparingSession(true)
    void loadVideoLandmarker().catch(() => undefined)
    try {
      const [, poseCriteria] = await Promise.all([ensureActiveSession(), getPoseCriteria()])
      setCriteria(poseCriteria as unknown as PoseCriteria)
      setView('reference-notice')
    } catch (error) {
      const message = error instanceof RefitApiError ? error.message : '서버 연결을 확인한 뒤 다시 시도해주세요.'
      window.alert(`분석 세션을 시작하지 못했습니다.\n${message}`)
    } finally {
      setIsPreparingSession(false)
    }
  }

  const handleReferenceFile = async (file: File) => {
    const sessionId = getStoredSessionId()
    if (!sessionId) return
    setRefBusy(true)
    setRefError(null)
    const url = URL.createObjectURL(file)
    try {
      const image = new Image()
      image.src = url
      await image.decode()
      const pose = await detectPoseFromImage(image)
      await uploadReferencePhoto(sessionId, { file, poseLandmarks: pose.landmarks, poseScaleBasis: pose.scaleBasis, posePersonAreaRatio: pose.personAreaRatio, multiPerson: pose.multiPerson })
      setRefData(prev => {
        if (prev) URL.revokeObjectURL(prev.url)
        return { pose, url, aspect: image.naturalWidth / image.naturalHeight }
      })
    } catch (error) {
      URL.revokeObjectURL(url)
      setRefError(userFacingMessage(error, '레퍼런스 사진을 확인하지 못했어요. 전신이 잘 나온 다른 사진으로 시도해주세요.'))
    } finally {
      setRefBusy(false)
    }
  }

  /** 갤러리 업로드 판정 경로 — 서버가 같은 값으로 다시 판정한다. */
  const uploadUser = async (file: File) => {
    const sessionId = getStoredSessionId()
    if (!sessionId || !refData || !criteria) return
    setLastUserPhoto(file)
    setPoseMessage(undefined)
    setView('pose-analyzing')
    const url = URL.createObjectURL(file)
    try {
      const image = new Image()
      image.src = url
      await image.decode()
      const userPose = await detectPoseFromImage(image)
      // 크기 기준(TORSO/HIP_KNEE)이 레퍼런스와 다르면 서버가 SCALE_BASIS_MISMATCH로
      // 거부한다 — 업로드 전에 걸러서 안내한다.
      if (userPose.scaleBasis !== refData.pose.scaleBasis) {
        setPoseMessage(SCALE_BASIS_GUIDE)
        setView('pose-failure')
        return
      }
      // 갤러리 업로드는 프리뷰(거울)가 없으므로 정방향 판정 그대로 (백엔드 최종 결정).
      const result = evaluate(refData.pose.landmarks, userPose.landmarks, criteria, {
        multiPerson: userPose.multiPerson,
        refAspect: refData.aspect,
        userAspect: image.naturalWidth / image.naturalHeight,
      })
      setPoseEvaluation(result)
      // NOT_ENOUGH_JOINTS·REF_PARTS_MISSING이면 업로드하지 않는다 — 서버는 숫자만
      // 받아서 "포즈를 맞춰주세요"라고 답하지만 실제 문제는 부위가 안 보이는 것.
      if (result.blockReason === 'NOT_ENOUGH_JOINTS' || result.blockReason === 'REF_PARTS_MISSING') {
        setPoseMessage(MESSAGES[result.blockReason])
        setView('pose-failure')
        return
      }
      await uploadUserPhoto(sessionId, { file, captureSource: 'UPLOAD', poseLandmarks: userPose.landmarks, poseSimilarity: result.pose_similarity, framingScore: result.framing_score, poseScaleBasis: userPose.scaleBasis, facingDelta: result.facing_delta, poseOks: result.oks, posePersonAreaRatio: userPose.personAreaRatio, multiPerson: userPose.multiPerson })
      setView('pose-success')
    } catch (error) {
      const unavailable = error instanceof RefitApiError && error.status === 503
      setPoseMessage(userFacingMessage(error, '사진을 분석하지 못했어요. 전신이 잘 나온 다른 사진으로 시도해주세요.'))
      setView(unavailable ? 'pose-unavailable' : 'pose-failure')
    } finally {
      URL.revokeObjectURL(url)
    }
  }

  const retrySamePhoto = () => { if (lastUserPhoto) void uploadUser(lastUserPhoto) }

  const beginAnalysis = async () => {
    const sessionId = getStoredSessionId()
    if (!sessionId) return
    setView('inbody-loading')
    try {
      // 사진 세그멘테이션(사피엔스)이 아직 도는 중이면 서버가 409를 준다.
      // 에러가 아니라 "아직"이라는 뜻이므로, 로딩 화면을 유지한 채 기다렸다가
      // 자동 재시도한다 — 사용자에게 "왜 안 넘어가지?"라는 순간을 만들지 않는다.
      let result: Record<string, unknown> | null = null
      for (let attempt = 0; attempt < 60; attempt += 1) {
        try {
          result = await startAnalysis(sessionId)
          break
        } catch (error) {
          if (error instanceof RefitApiError && error.status === 409) {
            await new Promise(resolve => window.setTimeout(resolve, 3000))
            continue
          }
          throw error
        }
      }
      if (!result) throw new Error('사진 분석이 예상보다 오래 걸리고 있어요. 잠시 후 다시 시도해주세요.')
      // 부위 진단(VLM)이 끝날 때까지 진행률 폴링 — reused=true(기존 결과)면 바로 완료로 나온다
      for (let attempt = 0; attempt < 200; attempt += 1) {
        const progress = await getAnalysisProgress(sessionId)
        if (progress.completed) break
        await new Promise(resolve => window.setTimeout(resolve, 2000))
      }
      const [analysis, segmentation] = await Promise.all([getAnalysis(sessionId), getSessionSegmentation(sessionId)])
      setAnalysisData(analysis)
      setSegmentationData(segmentation)
      setView('comparison')
    } catch (error) {
      // 비교 가능한 부위가 부족하면 사진 문제 — 재촬영으로 유도한다
      if (error instanceof RefitApiError && error.code === 'INSUFFICIENT_PARTS') {
        window.alert(error.message)
        setView('pose-capture')
        return
      }
      window.alert(userFacingMessage(error, '분석을 시작하지 못했습니다. 잠시 후 다시 시도해주세요.'))
      setView('inbody-upload')
    }
  }

  const handleInbodyFile = async (file: File) => {
    const sessionId = getStoredSessionId()
    if (!sessionId) return
    try {
      const result = await uploadInbody(sessionId, [file])
      setInbodyId(result.inbody_id)
      setInbodyJobId(result.job_id)
      setView('inbody-uploaded')
    } catch (error) {
      window.alert(userFacingMessage(error, '인바디 결과지를 업로드하지 못했습니다. 다른 사진으로 다시 시도해주세요.'))
    }
  }

  const openInbodyConfirmation = async () => {
    if (!inbodyId) return
    try {
      if (inbodyJobId) await waitForJob(inbodyJobId)
      const detail = await getInbody(inbodyId)
      setInbodyData(detail)
      setView('inbody-form')
    } catch (error) {
      window.alert(userFacingMessage(error, '인바디 결과를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'))
    }
  }

  const verifyInbodyAndBeginAnalysis = async (patch?: InbodyPatch) => {
    try {
      if (inbodyId) await patchInbody(inbodyId, { ...(patch ?? {}), verified: true })
      await beginAnalysis()
    } catch (error) {
      window.alert(userFacingMessage(error, '인바디 정보를 확인하지 못했습니다. 입력값을 다시 확인해주세요.'))
    }
  }

  const beginRoutine = async () => {
    const sessionId = getStoredSessionId()
    if (!sessionId) return
    setView('loading-two')
    try {
      const result = await createRoutine(sessionId, workoutDays)
      const jobId = getJobId(result)
      if (jobId) await waitForJob(jobId)
      const routine = await getActiveRoutine(sessionId)
      setRoutineData(routine)
      setView('custom-routine')
    } catch (error) {
      window.alert(userFacingMessage(error, '맞춤 루틴을 생성하지 못했습니다. 잠시 후 다시 시도해주세요.'))
      setView('exercise-days')
    }
  }

  const openTodayRoutine = async () => {
    const sessionId = getStoredSessionId()
    if (!sessionId) return
    try {
      const routine = await getTodayRoutine(sessionId)
      setTodayRoutine(routine)
      setView('today-routine')
    } catch (error) {
      window.alert(userFacingMessage(error, '오늘의 루틴을 불러오지 못했습니다.'))
    }
  }

  /**
   * 운동 완료 기록 후 피드백이 있으면 코치 대화(방법 B)로 잇는다.
   * workout-log의 feedback_text(방법 A)는 쓰지 않는다 — 코치 대화 [적용]과
   * 이중으로 루틴이 패치되는 것을 막기 위해 완료 기록만 남긴다.
   */
  const completeWorkout = async (feedbackText?: string) => {
    const sessionId = getStoredSessionId()
    if (!sessionId) return
    const dayOrder = todayRoutine?.progress.next_day_order ?? 1
    const cycleNo = todayRoutine?.progress.cycle_no ?? 1
    try {
      await createWorkoutLog(sessionId, { day_order: dayOrder, cycle_no: cycleNo, feedback_text: null })
    } catch (error) {
      window.alert(userFacingMessage(error, '운동 완료를 저장하지 못했습니다. 잠시 후 다시 시도해주세요.'))
      return
    }
    if (feedbackText) {
      setFeedbackMessage(feedbackText)
      setView('feedback-loading')
      await sendCoach([{ role: 'user', content: feedbackText }])
    } else {
      // 피드백 없이 완료 — 갱신된 오늘 루틴으로 복귀 (대화잠금 화면은 흐름에서 제외)
      setCoach(null)
      await openTodayRoutine()
    }
  }

  /** 코치 대화 왕복 — 응답의 messages를 그대로 되돌려 보낸다 (서버는 stateless). */
  const sendCoach = async (messages: CoachChatMessage[]) => {
    const sessionId = getStoredSessionId()
    if (!sessionId) return
    try {
      const response = await sendCoachMessage(sessionId, messages)
      setCoach(response)
      // 디자인 흐름 유지: 첫 응답은 주의부위 화면, 2턴째부터는 운동·강도 화면 레이아웃
      setView(response.finalized ? 'feedback-reflection' : response.turn > 1 ? 'feedback-exercise-intensity' : 'feedback-attention-area')
    } catch (error) {
      window.alert(userFacingMessage(error, '코치와 연결하지 못했어요. 잠시 후 다시 시도해주세요.'))
      await openTodayRoutine()
    }
  }

  const continueCoach = async (text: string) => {
    if (!coach) return
    setFeedbackMessage(text)
    setView('feedback-loading')
    await sendCoach([...coach.messages, { role: 'user', content: text }])
  }

  const applyCoach = async () => {
    const sessionId = getStoredSessionId()
    if (!sessionId || !coach) {
      setView('feedback-kept')
      return
    }
    try {
      await applyCoachChanges(sessionId, coach.messages)
      setView('feedback-applied')
    } catch (error) {
      window.alert(userFacingMessage(error, '변경 사항을 적용하지 못했어요. 잠시 후 다시 시도해주세요.'))
    }
  }

  /** [적용] 후 "바뀐 루틴 보기" — 새 버전이 활성화됐으므로 다시 불러온다. */
  const viewChangedRoutine = async () => {
    const sessionId = getStoredSessionId()
    if (sessionId) {
      try {
        const routine = await getActiveRoutine(sessionId)
        setRoutineData(routine)
      } catch {
        // 조회 실패해도 화면 이동은 한다 — 이전 버전이 보일 뿐
      }
    }
    setView('custom-routine')
  }

  useEffect(() => {
    if (view !== 'feedback-applied' && view !== 'feedback-kept') return
    // 결과 카드를 잠시 보여준 뒤 갱신된 오늘 루틴으로 복귀 (대화잠금 화면은 흐름에서 제외)
    const timer = window.setTimeout(() => { void openTodayRoutine() }, 2500)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view])

  if (view === 'reference-notice' || view === 'reference') return <ReferenceScreen
    ready={Boolean(refData)} busy={refBusy} error={refError}
    showNotice={view === 'reference-notice'}
    onConfirm={() => setView('reference')}
    onSelectFile={file => void handleReferenceFile(file)}
    onStart={() => setView('pose-capture')} />
  if (view === 'pose-capture') return refData && criteria
    ? <PoseCaptureScreen sessionId={getStoredSessionId() ?? ''} criteria={criteria}
        refLm={refData.pose.landmarks as PoseLandmarks} refAspect={refData.aspect} refScaleBasis={refData.pose.scaleBasis} referenceUrl={refData.url}
        onNext={() => setView('inbody-upload')}
        onBrowse={file => void uploadUser(file)} />
    : null
  if (view === 'pose-analyzing') return <PoseScreen result="loading" score={poseEvaluation?.pose_similarity ?? 0} referenceUrl={refData?.url ?? null} onRetry={retrySamePhoto} onBrowse={file => void uploadUser(file)} onLive={() => setView('pose-capture')} onNext={() => undefined} />
  if (view === 'pose-failure') return <PoseScreen result="failure" score={poseEvaluation?.pose_similarity ?? 0} message={poseMessage} referenceUrl={refData?.url ?? null} onRetry={retrySamePhoto} onBrowse={file => void uploadUser(file)} onLive={() => setView('pose-capture')} onNext={() => undefined} />
  if (view === 'pose-unavailable') return <PoseScreen result="unavailable" score={poseEvaluation?.pose_similarity ?? 0} message={poseMessage} referenceUrl={refData?.url ?? null} onRetry={retrySamePhoto} onBrowse={file => void uploadUser(file)} onLive={() => setView('pose-capture')} onNext={() => undefined} />
  if (view === 'pose-success') return <PoseScreen result="success" score={poseEvaluation?.pose_similarity ?? 100} referenceUrl={refData?.url ?? null} onRetry={() => undefined} onBrowse={file => void uploadUser(file)} onLive={() => setView('pose-capture')} onNext={() => setView('inbody-upload')} />
  if (view === 'inbody-upload') return <><input ref={inbodyFileInputRef} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp,image/heic" onChange={event => { const file = event.currentTarget.files?.[0]; if (file) void handleInbodyFile(file); event.currentTarget.value = '' }} /><InbodyUploadBeforeScreen onUpload={() => inbodyFileInputRef.current?.click()} onComplete={() => void beginAnalysis()} onSkip={() => void beginAnalysis()} /></>
  if (view === 'inbody-uploaded') return <InbodyUploadSuccessScreen onChangePhoto={() => setView('inbody-upload')} onStart={() => void openInbodyConfirmation()} onSkip={() => void beginAnalysis()} />
  if (view === 'inbody-form') return <InbodyUploadAfterScreen inbody={inbodyData} onConfirm={patch => void verifyInbodyAndBeginAnalysis(patch)} onPrevious={() => setView('inbody-uploaded')} />
  if (view === 'inbody-range-error') return <InbodyRangeErrorScreen onConfirm={() => void verifyInbodyAndBeginAnalysis()} onPrevious={() => setView('inbody-form')} />
  if (view === 'inbody-warning') return <InbodyValidationWarningScreen onConfirm={() => void verifyInbodyAndBeginAnalysis()} onPrevious={() => setView('inbody-range-error')} />
  if (view === 'inbody-fixed') return <InbodyAllErrorsFixedScreen onConfirm={() => void verifyInbodyAndBeginAnalysis()} onPrevious={() => setView('inbody-warning')} />
  if (view === 'inbody-unreadable') return <InbodyUnreadableScreen onConfirm={() => setView('inbody-form')} onPrevious={() => setView('inbody-uploaded')} />
  if (view === 'inbody-loading') return <LoadingOneScreen onComplete={() => undefined} />
  if (view === 'comparison') return <ComparisonAnalysisScreen analysis={analysisData} segmentation={segmentationData} onCreateRoutine={() => setView('exercise-days')} />
  if (view === 'exercise-days') return <ExerciseDaysScreen days={workoutDays} onDaysChange={setWorkoutDays} onNext={() => void beginRoutine()} />
  if (view === 'loading-two') return <LoadingTwoScreen onComplete={() => undefined} />
  if (view === 'custom-routine') return <CustomRoutineScreen routine={routineData} onAdjustDays={() => setView('exercise-days')} onViewDay={day => { setSelectedDay(day); setView('custom-routine-detail') }} onNext={() => void openTodayRoutine()} />
  if (view === 'custom-routine-detail') return <CustomRoutineDetailScreen day={selectedDay} onPrevious={() => setView('custom-routine')} />
  if (view === 'today-routine') return <TodayRoutineScreen today={todayRoutine} onFinish={() => setView('feedback')} />
  if (view === 'feedback') return <FeedbackScreen onSubmit={message => void completeWorkout(message)} onSkip={() => void completeWorkout()} />
  if (view === 'feedback-loading') return <FeedbackLoadingScreen feedback={feedbackMessage} onComplete={() => undefined} />
  if (view === 'feedback-attention-area') return <FeedbackAttentionAreaScreen userMessage={feedbackMessage} coach={coach} onSubmit={message => void continueCoach(message)} />
  if (view === 'feedback-exercise-intensity') return <FeedbackExerciseIntensityScreen userMessage={feedbackMessage} coach={coach} onSubmit={message => void continueCoach(message)} onNext={() => { if (coach?.finalized) setView('feedback-reflection') }} />
  if (view === 'feedback-reflection') return <FeedbackReflectionScreen finalized={coach?.finalized ?? null} onApply={() => void applyCoach()} onKeep={() => setView('feedback-kept')} />
  if (view === 'feedback-applied') return <FeedbackAppliedScreen onViewRoutine={() => void viewChangedRoutine()} />
  if (view === 'feedback-kept') return <FeedbackKeptScreen />
  return <main className="onboarding"><OnboardingOne /><OnboardingTwo /><OnboardingThree /><OnboardingFour onStart={openReference} /></main>
}

export default App
