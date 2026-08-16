import { useEffect, useRef, useState, type ReactNode } from 'react'
import heroBackground from './assets/onboarding-hero-background.png'
import heroPhone from './assets/onboarding-hero-phone.png'
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
import poseSuccessCheck from './assets/pose-success-check.svg'
import { FixedStepFrame } from './components/FixedStepFrame'
import { PoseCaptureScreen } from './screens/PoseCaptureScreen'
import { ensureSession, ensureUser, loadCriteria, uploadReferencePhoto } from './lib/api'
import { loadLandmarkers } from './lib/landmarkers'
import type { PoseCriteria, PoseLandmarks } from './lib/pose-score.js'
import { InbodyUploadAfterScreen } from './screens/InbodyUploadAfterScreen'
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
import { FeedbackConversationLockedScreen } from './screens/FeedbackConversationLockedScreen'
import './App.css'

type SectionProps = { children: ReactNode; className: string; label: string; scaleToViewport?: boolean; designHeight?: number }
type AppView = 'onboarding' | 'reference-notice' | 'reference' | 'pose-capture' | 'inbody-upload' | 'inbody-uploaded' | 'inbody-form' | 'inbody-range-error' | 'inbody-warning' | 'inbody-fixed' | 'inbody-unreadable' | 'inbody-loading' | 'comparison' | 'exercise-days' | 'loading-two' | 'custom-routine' | 'custom-routine-detail' | 'today-routine' | 'feedback' | 'feedback-loading' | 'feedback-attention-area' | 'feedback-exercise-intensity' | 'feedback-reflection' | 'feedback-conversation-locked' | 'feedback-applied' | 'feedback-kept'

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

function RefitLogo({ small = false }: { small?: boolean }) {
  return <p className={`logo ${small ? 'logo--small' : ''}`} aria-label="REFIT"><span>RE</span><span>:</span><strong>FIT</strong></p>
}

function StartButton({ wide = false, onStart }: { wide?: boolean; onStart: () => void }) {
  return <button className={`ai-button ${wide ? 'ai-button--wide' : ''}`} type="button" onClick={onStart}>AI 분석 진단하기</button>
}

function OnboardingOne({ onStart }: { onStart: () => void }) {
  return <RevealSection className="hero-section" label="REFIT 소개" scaleToViewport>
    <img className="hero-section__texture motion motion--soft" src={heroBackground} alt="" />
    <div className="hero-section__content">
      <div className="motion motion--delay-1"><RefitLogo /></div>
      <p className="hero-section__description motion motion--delay-2">원하는 체형의 사진을 선택하고, 나의 체형 정보를<br />입력하면 AI가 운동 루틴을 제공합니다.</p>
      <div className="motion motion--delay-3"><StartButton onStart={onStart} /></div>
    </div>
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
    <RefitLogo small /><div className="closing-section__copy motion"><h1>AI가 만드는 <em>맞춤 루틴</em></h1><p>오늘부터 RE:FIT과 함께, 내가 바라는 건강함을 차곡차곡</p></div>
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
  detecting: boolean
  uploading: boolean
  error: string | null
  showNotice: boolean
  onConfirm: () => void
  onSelectFile: (file: File) => void
  onStart: () => void
}

function ReferenceScreen({ ready, detecting, uploading, error, showNotice, onConfirm, onSelectFile, onStart }: ReferenceScreenProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const pick = (files: FileList | null) => { const file = files?.[0]; if (file) onSelectFile(file) }
  return <FixedStepFrame label="Step 1 목표 체형 레퍼런스"><div className="reference-page">
      <p className="step-label">Step 1/3</p>
      <h1>목표 체형 레퍼런스</h1>
      <p className="step-description">원하는 체형의 사진을 등록하면 AI가 차이를 분석합니다</p>
      <ReferenceHints />
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic" hidden onChange={event => { pick(event.target.files); event.target.value = '' }} />
      <button type="button" className={`reference-dropzone ${ready ? 'is-ready' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={event => event.preventDefault()}
        onDrop={event => { event.preventDefault(); pick(event.dataTransfer.files) }}>
        {detecting
          ? <p>레퍼런스 사진을 분석하고 있어요…</p>
          : ready
            ? <><img className="reference-dropzone__done" src={referenceUploaded} alt="" /><img className="reference-dropzone__check" src={poseSuccessCheck} alt="" /><strong>사진이 업로드 되었습니다!</strong><span>다른 사진으로 변경하려면 클릭하세요</span></>
            : <><img src={referenceUpload} alt="" /><p>파일을 선택하거나 여기로 끌어다 놓으세요.</p></>}
      </button>
      {error && <p className="reference-error" role="alert">{error}</p>}
      <button className={`reference-start ${ready ? 'is-ready' : ''}`} type="button" disabled={!ready || detecting || uploading} onClick={onStart}>{uploading ? '레퍼런스 업로드 중…' : 'AI 분석 비교 시작 →'}</button>
      {showNotice && <section className="reference-notice" role="dialog" aria-modal="true" aria-labelledby="reference-notice-title">
        <span className="reference-notice__icon"><img src={referenceInfo} alt="" /></span>
        <h2 id="reference-notice-title">레퍼런스 주의사항 안내</h2>
        <p>해당 레퍼런스 이미지에 있는 부위에 대한 루틴만 제공되오니<br />신중하게 업로드해주시길 바랍니다.</p>
        <button type="button" onClick={onConfirm}>확인</button>
      </section>}
  </div></FixedStepFrame>
}

type ReferenceData = { file: File; lm: PoseLandmarks; aspect: number; multiPerson: boolean; url: string }
type Boot = { userId: string; sessionId: string; criteria: PoseCriteria }

function App() {
  const [view, setView] = useState<AppView>('onboarding')
  const [workoutDays, setWorkoutDays] = useState(1)
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [followupFeedbackMessage, setFollowupFeedbackMessage] = useState('')
  const [boot, setBoot] = useState<Boot | null>(null)
  const bootPromise = useRef<Promise<Boot> | null>(null)
  const [refData, setRefData] = useState<ReferenceData | null>(null)
  const [refDetecting, setRefDetecting] = useState(false)
  const [refUploading, setRefUploading] = useState(false)
  const [refError, setRefError] = useState<string | null>(null)

  // 사용자·세션·판정 기준(GET /pose-criteria)은 시작 시 한 번만. 모델·wasm도 미리 로드.
  const ensureBoot = () => {
    if (!bootPromise.current) {
      const promise = (async () => {
        const userId = await ensureUser()
        const [sessionId, criteria] = await Promise.all([ensureSession(userId), loadCriteria()])
        return { userId, sessionId, criteria }
      })()
      promise.then(setBoot, () => { bootPromise.current = null })
      bootPromise.current = promise
      loadLandmarkers().catch(() => undefined)
    }
    return bootPromise.current
  }

  const openReference = () => { void ensureBoot(); setView('reference-notice') }

  const handleReferenceFile = async (file: File) => {
    setRefDetecting(true)
    setRefError(null)
    const url = URL.createObjectURL(file)
    try {
      const { image } = await loadLandmarkers()
      const img = new Image()
      img.src = url
      await img.decode()
      const res = image.detect(img)
      const lm = res.landmarks[0] as PoseLandmarks | undefined
      if (!lm) {
        URL.revokeObjectURL(url)
        setRefError('사람을 찾지 못했어요. 전신이 나온 다른 사진으로 시도해주세요.')
        return
      }
      setRefData(prev => {
        if (prev) URL.revokeObjectURL(prev.url)
        return { file, lm, aspect: img.naturalWidth / img.naturalHeight, multiPerson: res.landmarks.length > 1, url }
      })
    } catch {
      URL.revokeObjectURL(url)
      setRefError('사진을 분석하지 못했어요. 잠시 후 다시 시도해주세요.')
    } finally {
      setRefDetecting(false)
    }
  }

  const startAnalysis = async () => {
    if (!refData) return
    setRefUploading(true)
    setRefError(null)
    try {
      const ready = await ensureBoot()
      await uploadReferencePhoto(ready.userId, ready.sessionId, refData.file, refData.lm, refData.multiPerson)
      setView('pose-capture')
    } catch (error) {
      setRefError(error instanceof Error ? error.message : '레퍼런스 업로드에 실패했습니다.')
    } finally {
      setRefUploading(false)
    }
  }
  useEffect(() => {
    if (view !== 'feedback-applied' && view !== 'feedback-kept') return
    const timer = window.setTimeout(() => setView('feedback-conversation-locked'), 2000)
    return () => window.clearTimeout(timer)
  }, [view])

  if (view === 'reference-notice' || view === 'reference') return <ReferenceScreen
    ready={Boolean(refData)} detecting={refDetecting} uploading={refUploading} error={refError}
    showNotice={view === 'reference-notice'}
    onConfirm={() => setView('reference')}
    onSelectFile={file => void handleReferenceFile(file)}
    onStart={() => void startAnalysis()} />
  if (view === 'pose-capture') return boot && refData
    ? <PoseCaptureScreen userId={boot.userId} sessionId={boot.sessionId} criteria={boot.criteria}
        refLm={refData.lm} refAspect={refData.aspect} referenceUrl={refData.url}
        onNext={() => setView('inbody-upload')} />
    : null
  if (view === 'inbody-upload') return <InbodyUploadBeforeScreen onUpload={() => setView('inbody-uploaded')} onComplete={() => undefined} />
  if (view === 'inbody-uploaded') return <InbodyUploadSuccessScreen onChangePhoto={() => undefined} onStart={() => setView('inbody-form')} onSkip={() => setView('inbody-loading')} />
  if (view === 'inbody-form') return <InbodyUploadAfterScreen onConfirm={() => setView('inbody-range-error')} onSkip={() => setView('inbody-loading')} onPrevious={() => setView('inbody-uploaded')} />
  if (view === 'inbody-range-error') return <InbodyRangeErrorScreen onConfirm={() => setView('inbody-warning')} onSkip={() => setView('inbody-loading')} onPrevious={() => setView('inbody-form')} />
  if (view === 'inbody-warning') return <InbodyValidationWarningScreen onConfirm={() => setView('inbody-fixed')} onSkip={() => setView('inbody-loading')} onPrevious={() => setView('inbody-range-error')} />
  if (view === 'inbody-fixed') return <InbodyAllErrorsFixedScreen onConfirm={() => setView('inbody-loading')} onSkip={() => setView('inbody-loading')} onPrevious={() => setView('inbody-warning')} />
  if (view === 'inbody-unreadable') return <InbodyUnreadableScreen onConfirm={() => setView('inbody-form')} onSkip={() => setView('inbody-loading')} onPrevious={() => setView('inbody-uploaded')} />
  if (view === 'inbody-loading') return <LoadingOneScreen onComplete={() => setView('comparison')} />
  if (view === 'comparison') return <ComparisonAnalysisScreen onCreateRoutine={() => setView('exercise-days')} />
  if (view === 'exercise-days') return <ExerciseDaysScreen days={workoutDays} onDaysChange={setWorkoutDays} onNext={() => setView('loading-two')} />
  if (view === 'loading-two') return <LoadingTwoScreen onComplete={() => setView('custom-routine')} />
  if (view === 'custom-routine') return <CustomRoutineScreen workoutDays={workoutDays} onAdjustDays={() => setView('exercise-days')} onViewDayOne={() => setView('custom-routine-detail')} onNext={() => setView('today-routine')} />
  if (view === 'custom-routine-detail') return <CustomRoutineDetailScreen onPrevious={() => setView('custom-routine')} />
  if (view === 'today-routine') return <TodayRoutineScreen onFinish={() => setView('feedback')} />
  if (view === 'feedback') return <FeedbackScreen onSubmit={message => { setFeedbackMessage(message); setView('feedback-loading') }} onSkip={() => undefined} />
  if (view === 'feedback-loading') return <FeedbackLoadingScreen feedback={feedbackMessage} onComplete={() => setView('feedback-attention-area')} />
  if (view === 'feedback-attention-area') return <FeedbackAttentionAreaScreen feedback={feedbackMessage} onSubmit={message => { setFollowupFeedbackMessage(message); setView('feedback-exercise-intensity') }} />
  if (view === 'feedback-exercise-intensity') return <FeedbackExerciseIntensityScreen feedback={followupFeedbackMessage} onNext={() => setView('feedback-reflection')} />
  if (view === 'feedback-reflection') return <FeedbackReflectionScreen onApply={() => setView('feedback-applied')} onKeep={() => setView('feedback-kept')} />
  if (view === 'feedback-conversation-locked') return <FeedbackConversationLockedScreen />
  if (view === 'feedback-applied') return <FeedbackAppliedScreen />
  if (view === 'feedback-kept') return <FeedbackKeptScreen />
  return <main className="onboarding"><OnboardingOne onStart={openReference} /><OnboardingTwo /><OnboardingThree /><OnboardingFour onStart={openReference} /></main>
}

export default App
