import { useEffect, useRef, useState, type ReactNode } from 'react'
import heroBackground from './assets/onboarding-hero-background-figma.png'
import heroPhone from './assets/onboarding-hero-phone.png'
import onboardingScrollCue from './assets/onboarding-scroll-cue.svg'
import routineFigure from './assets/routine-figure.png'
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
import { PreviousButton } from './components/PreviousButton'
import { PoseScore } from './components/PoseScore'
import { PoseCaptureScreen } from './screens/PoseCaptureScreen'
import { applyCoachChanges, createRoutine, createWorkoutLog, getActiveRoutine, getAnalysis, getAnalysisProgress, getInbody, getJob, getPoseCriteria, getSessionSegmentation, getStoredSessionId, getTodayRoutine, patchInbody, RefitApiError, sendCoachMessage, startAnalysis, uploadInbody, uploadReferencePhoto, uploadUserPhoto, userFacingMessage, ensureActiveSession, type AnalysisResult, type CoachChatMessage, type CoachChatResponse, type InbodyDetail, type Job, type RoutineDay, type RoutineDetail, type SessionSegmentation, type TodayRoutine } from './lib/api'
import { detectPoseFromImage, type DetectedPose } from './lib/pose-detector'
import { loadVideoLandmarker } from './lib/landmarkers'
import { evaluate, MESSAGES, type PoseCriteria, type PoseEvaluation, type PoseLandmarks } from './lib/pose-score.js'
import { viewportScale } from './lib/viewport-scale'

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

/**
 * 등장 애니메이션 발동 조건.
 *
 * ⚠️ 종전에는 `threshold: 0.18` 이었는데, 섹션이 1058~1417px 로 뷰포트보다 커서
 *    18% 는 **화면 아래 21~28% 만 걸친 시점**이었다. 거기서 750~1100ms(+지연 360ms)
 *    가 시작되니, 사용자가 섹션을 다 내리기도 전에 애니메이션이 끝나 있었다.
 *
 * 그래서 면적 비율 대신 **위치**로 잡는다 — 아래쪽 45% 를 잘라낸 가상의 뷰포트에
 * 섹션 윗변이 들어올 때(= 화면 아래 절반쯤을 채울 때) 시작한다. 섹션 높이에
 * 영향받지 않으므로 섹션마다 체감이 같다.
 */
const REVEAL_OBSERVER: IntersectionObserverInit = { threshold: 0, rootMargin: '0px 0px -45% 0px' }

/** 잠깐 스쳐 가는 화면 — 뒤로가기 기록에 남기지 않는다. */
const TRANSIENT_VIEWS: AppView[] = ['pose-analyzing', 'inbody-loading', 'loading-two', 'feedback-loading']

const RESUME_KEY = 'refit.view'

/**
 * 새로고침 후 되살릴 수 있는 화면 — **서버에서 다시 받아 채울 수 있는 것만** 넣는다.
 *
 * ⚠️ 여기에 화면을 추가하려면 App 의 복원 효과(resumedView 를 보는 useEffect)에도
 *    그 화면의 데이터를 받아오는 분기를 같이 넣어야 한다. 한쪽만 하면 화면은 뜨는데
 *    내용이 비어 있다.
 */
const RESUMABLE_VIEWS: AppView[] = [
  'reference-notice', 'reference', 'inbody-upload', 'comparison',
  'exercise-days', 'custom-routine', 'today-routine', 'feedback',
]

/**
 * 되살릴 수 없는 화면 → 가장 가까운 되살릴 수 있는 화면.
 *
 * ⚠️ 이 화면들은 **서버에 없는 값**에 기대고 있다 — 사용자가 고른 File(포즈 판정),
 *    코치 대화 내역, 화면에서 고른 Day. 그대로 복원하면 점수 0점짜리 결과 화면이나
 *    빈 페이지가 뜬다. 한 단계 앞으로 내려서 사용자가 그 화면을 **다시 만들게** 한다.
 */
const RESUME_FALLBACK: Partial<Record<AppView, AppView>> = {
  'pose-capture': 'reference', 'pose-analyzing': 'reference', 'pose-failure': 'reference',
  'pose-unavailable': 'reference', 'pose-success': 'reference',
  'inbody-uploaded': 'inbody-upload', 'inbody-form': 'inbody-upload',
  'inbody-range-error': 'inbody-upload', 'inbody-warning': 'inbody-upload',
  'inbody-fixed': 'inbody-upload', 'inbody-unreadable': 'inbody-upload',
  'inbody-loading': 'inbody-upload',
  'loading-two': 'exercise-days',
  'custom-routine-detail': 'custom-routine',
  'feedback-loading': 'today-routine', 'feedback-attention-area': 'today-routine',
  'feedback-exercise-intensity': 'today-routine', 'feedback-reflection': 'today-routine',
  'feedback-applied': 'today-routine', 'feedback-kept': 'today-routine',
}

/**
 * 새로고침 직후 보여줄 화면. **useState 초기값으로 동기 호출한다** — 효과에서 하면
 * 온보딩이 한 프레임 번쩍인 뒤 화면이 바뀐다.
 *
 * ⚠️ history.state 는 쓸 수 없다. 아래 첫 기록 효과가 마운트 직후 replaceState 로
 *    덮어쓰므로, 읽으려던 값이 이미 사라진 뒤다. 그래서 sessionStorage 에 따로 적는다
 *    (탭을 닫으면 지워지는 것도 의도 — 새 탭은 온보딩부터가 맞다).
 */
function restoreView(): AppView {
  // 세션이 없으면 되살릴 것도 없다 — 어차피 모든 조회가 사용자 없이 실패한다.
  if (!getStoredSessionId()) return 'onboarding'
  let saved: string | null = null
  try { saved = sessionStorage.getItem(RESUME_KEY) } catch { return 'onboarding' }
  if (!saved) return 'onboarding'
  const target = RESUME_FALLBACK[saved as AppView] ?? (saved as AppView)
  return RESUMABLE_VIEWS.includes(target) ? target : 'onboarding'
}

/** Reveals a design section once it reaches the viewport. */
function RevealSection({ children, className, label, scaleToViewport = false, designHeight = 1024 }: SectionProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [scale, setScale] = useState(() => viewportScale(1440))

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    const observer = new IntersectionObserver(([entry]) => {
      // 이미 지나친 섹션(새로고침 스크롤 복원)도 즉시 드러낸다 — 안 그러면 영영 opacity 0
      if (!entry.isIntersecting && entry.boundingClientRect.top >= 0) return
      setIsVisible(true)
      observer.unobserve(entry.target)
    }, REVEAL_OBSERVER)
    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!scaleToViewport) return
    // ⚠️ resize 는 창 크기뿐 아니라 **확대/축소에도 발생한다** — 둘 다 여기서 처리된다.
    const updateScale = () => setScale(viewportScale(1440))
    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [scaleToViewport])

  // ⚠️ 폭도 배율만큼 준다. transform 은 자리 차지를 바꾸지 않아서, 폭을 안 주면
  //    확대했을 때 늘어난 부분이 잘려나가고 가로 스크롤도 안 생긴다.
  const stageStyle = scaleToViewport ? { width: `${1440 * scale}px`, height: `${designHeight * scale}px` } : undefined
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
  return <RevealSection className="onboarding-wellness" label="온보딩 2: WELLNESS" scaleToViewport designHeight={1417}>
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
  return <RevealSection className="onboarding-function" label="온보딩 3: 기능 소개" scaleToViewport designHeight={1130}>
    <p className="onboarding-function__subtitle motion">리핏만이 제공하는 기능</p>
    <h1 className="onboarding-function__title motion motion--delay-1">FUNCTION</h1>
    <div className="onboarding-function__cards">{cards.map((card, index) => <article className={`onboarding-function__card motion motion--delay-${index + 1}`} key={card.number}>
      <span className="onboarding-function__number"><img src={card.icon} alt="" /><b>{card.number}</b></span><h2>{card.title}</h2><p>{card.description}</p>
    </article>)}</div>
  </RevealSection>
}

function OnboardingFour({ onStart }: { onStart: () => void }) {
  return <RevealSection className="closing-section" label="온보딩 4: REFIT 시작하기" scaleToViewport designHeight={1058}>
    <RefitLogo small /><div className="closing-section__copy motion"><h1>AI가 만드는 <em>맞춤 루틴</em></h1><p>오늘부터 REFIT과 함께, 내가 바라는 건강함을 차곡차곡</p></div>
    <div className="closing-section__illustration motion motion--delay-1" aria-hidden="true"><img className="closing-section__platform" src={routinePlatform} alt="" /><img className="closing-section__figure" src={routineFigure} alt="" /></div>
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
  onPrevious: () => void
}

function ReferenceScreen({ ready, busy, error, showNotice, onConfirm, onSelectFile, onStart, onPrevious }: ReferenceScreenProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const pick = (files: FileList | null) => { const file = files?.[0]; if (file) onSelectFile(file) }
  return <FixedStepFrame label="Step 1 목표 체형 레퍼런스"><div className="reference-page">
      <p className="step-label">Step 1/3</p>
      <h1>목표 체형 레퍼런스</h1>
      <p className="step-description">원하는 체형의 사진을 등록하면 AI가 차이를 분석합니다</p>
      <PreviousButton onClick={onPrevious} />
      <ReferenceHints />
      <input ref={inputRef} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => { pick(event.currentTarget.files); event.currentTarget.value = '' }} />
      <button type="button" className={`reference-dropzone ${ready ? 'is-ready' : ''}`} disabled={busy || showNotice}
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
      {showNotice && <>
        {/* 막이 뒤를 덮어 시선을 모으고, 확인을 누르기 전에는 업로드가 눌리지 않게 한다 */}
        <div className="reference-notice-veil" aria-hidden="true" />
        <section className="reference-notice" role="dialog" aria-modal="true" aria-labelledby="reference-notice-title">
          <span className="reference-notice__icon"><img src={referenceInfo} alt="" /></span>
          <h2 id="reference-notice-title">레퍼런스 주의사항 안내</h2>
          <p>해당 레퍼런스 이미지에 있는 부위에 대한 루틴만 제공되오니<br />신중하게 업로드해주시길 바랍니다.</p>
          <button type="button" autoFocus onClick={onConfirm}>확인</button>
        </section>
      </>}
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
  /** 사용자가 고른 사진 — 프레임 안에 미리보기로 띄운다 */
  userPhoto: File | null
  onRetry: () => void
  onBrowse: (file: File) => void
  onLive: () => void
  onNext: () => void
  onPrevious: () => void
}

function PoseScreen({ result, score, message, referenceUrl, userPhoto, onRetry, onBrowse, onLive, onNext, onPrevious }: PoseScreenProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  // 미리보기 URL은 **효과 안에서** 만든다. useMemo 로 만들면 StrictMode 가 효과를 두 번
  // 돌릴 때 첫 URL 이 해제되는데 useMemo 값은 그대로라, 이미 죽은 주소를 계속 가리켜
  // 사진이 깨져 보인다 (실제로 그렇게 나왔다).
  const [userPhotoUrl, setUserPhotoUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!userPhoto) { setUserPhotoUrl(null); return }
    const url = URL.createObjectURL(userPhoto)
    setUserPhotoUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [userPhoto])
  return <FixedStepFrame label={`Step 2 체형 사진 ${result}`}><div className="pose-page">
      <p className="step-label">Step 2/3</p>
      <h1>체형 사진 업로드</h1>
      <p className="step-description">레퍼런스와 같은 포즈로 자신의 체형을 업로드 해주세요!</p><PreviousButton onClick={onPrevious} />
      {referenceUrl && <div className="pose-reference pose-reference--live"><img src={referenceUrl} alt="레퍼런스 체형" /></div>}
      <PoseCorners />
      {userPhotoUrl && <div className="pose-user-photo"><img src={userPhotoUrl} alt="업로드한 체형 사진" /></div>}
      <input ref={inputRef} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => { const file = event.currentTarget.files?.[0]; if (file) onBrowse(file); event.currentTarget.value = '' }} />
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

/** onStatus: 폴링할 때마다 현재 잡 상태를 알려준다 — 로딩 화면 진행률의 유일한 근거다. */
async function waitForJob(jobId: string, onStatus?: (status: Job['status']) => void): Promise<Job> {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const job = await getJob(jobId)
    onStatus?.(job.status)
    if (job.status === 'DONE') return job
    if (job.status === 'FAILED') throw new Error(job.error || 'The requested job failed.')
    await new Promise(resolve => window.setTimeout(resolve, 1500))
  }
  throw new Error('The requested job timed out.')
}

function hasInbodyExtraction(detail: InbodyDetail): boolean {
  return Object.values(detail.fields).some(value => value !== null && value !== undefined && value !== '') || detail.smi !== null || detail.segments.some(segment => segment.lean_mass !== null || segment.fat_mass !== null)
}

async function waitForInbodyDetail(inbodyId: string, jobId: string | null): Promise<InbodyDetail> {
  let lastReadError: unknown = null
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      const detail = await getInbody(inbodyId)
      if (hasInbodyExtraction(detail)) return detail
    } catch (error) {
      lastReadError = error
    }
    if (jobId) {
      const job = await getJob(jobId)
      if (job.status === 'FAILED') throw new Error(job.error || 'The requested job failed.')
    }
    await new Promise(resolve => window.setTimeout(resolve, 1500))
  }
  if (lastReadError instanceof Error) throw lastReadError
  throw new Error('The InBody result was not ready in time.')
}

/**
 * 결과 화면이 «비어 보이지 않을» 최소 조건.
 *
 * ⚠️ 점수와 요약은 종합 진단(VLM_OVERALL)에서 온다. 부위 진단만 끝난 응답에는
 *    overall 이 비어 있어서 «-점 / 요약을 준비하고 있어요»가 뜬다. 로딩을 다 보고
 *    넘어온 사용자에게 그 화면을 보이지 않는 것이 로딩 화면의 존재 이유다.
 */
function isAnalysisRenderable(analysis: AnalysisResult | null): boolean {
  if (!analysis || analysis.parts.length === 0) return false
  return analysis.overall !== null && analysis.overall.similarity_score !== null
}

/** 세그멘테이션 조회 — 오래 걸리면 포기한다. 사진이 없어도 수치·문구는 읽을 수 있다. */
async function fetchSegmentation(sessionId: string): Promise<SessionSegmentation | null> {
  try {
    return await Promise.race([
      getSessionSegmentation(sessionId),
      new Promise<null>(resolve => window.setTimeout(() => resolve(null), 10000)),
    ])
  } catch {
    return null
  }
}

function App() {
  // 복원 대상은 **첫 렌더에 한 번** 정한다. 값이 바뀌지 않으므로 아래 복원 효과의
  // 의존성에 그대로 넣을 수 있다 — 억지로 비운 의존성 배열보다 안전하다.
  const [resumedView] = useState(restoreView)
  const [view, setView] = useState<AppView>(resumedView)
  const isRestoringHistory = useRef(false)
  const isFirstHistoryEntry = useRef(true)

  // 화면 전환을 브라우저 기록에 심어 뒤로가기가 사이트를 벗어나지 않게 한다.
  // ⚠️ 첫 화면은 push 가 아니라 replace 다 — push 하면 온보딩에서 뒤로가기를 눌러도
  //    같은 화면이 다시 나와 빠져나갈 수 없다.
  useEffect(() => {
    // 새로고침 복원용 — 뒤로가기 기록과 달리 **탭이 살아 있는 동안** 유지된다.
    try { sessionStorage.setItem(RESUME_KEY, view) } catch { /* 사파리 프라이빗 등 — 복원만 포기 */ }
    if (isRestoringHistory.current) { isRestoringHistory.current = false; return }
    if (isFirstHistoryEntry.current) {
      isFirstHistoryEntry.current = false
      window.history.replaceState({ view }, '')
      return
    }
    // 로딩·분석처럼 스쳐 지나가는 화면은 기록을 남기지 않는다(replace) — 남기면
    // 뒤로가기가 이미 끝난 로딩 화면으로 되돌아가 멈춰 있는 것처럼 보인다.
    if (TRANSIENT_VIEWS.includes(view)) window.history.replaceState({ view }, '')
    else window.history.pushState({ view }, '')
  }, [view])

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const restored = (event.state as { view?: AppView } | null)?.view
      isRestoringHistory.current = true
      setView(restored ?? 'onboarding')
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])
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
  // 로딩 화면 진행률 — 화면이 스스로 시간을 재지 않고 **여기서 실제 단계를 받아 간다.**
  // ⚠️ ...Ready 는 결과까지 다 받은 뒤에만 true 로 만든다. 이걸 먼저 켜면 진행률이
  //    다시 거짓말을 하게 되고, 그게 이 화면들을 고친 이유였다.
  const [analysisPhase, setAnalysisPhase] = useState(0)
  const [isAnalysisReady, setIsAnalysisReady] = useState(false)
  const [routinePhase, setRoutinePhase] = useState(0)
  const [isRoutineReady, setIsRoutineReady] = useState(false)

  /**
   * 복원된 화면의 내용을 서버에서 다시 채운다.
   *
   * ⚠️ 화면 전환(setView)은 하지 않는다 — 화면은 restoreView() 가 이미 동기로 정했다.
   *    여기서 또 옮기면 사용자가 그 사이에 누른 버튼을 되돌려 버린다.
   *
   * ⚠️ 실패해도 화면을 바꾸지 않는다. 각 화면이 null 을 견디도록 되어 있어서
   *    "준비 중" 상태로 보이고, 사용자는 뒤로 가서 다시 만들 수 있다. 여기서 온보딩으로
   *    튕기면 새로고침할 때마다 처음으로 돌아가는 지금 문제가 그대로 남는다.
   */
  useEffect(() => {
    const resumed = resumedView
    if (resumed === 'onboarding') return
    const sessionId = getStoredSessionId()
    if (!sessionId) return
    let cancelled = false
    void (async () => {
      try {
        if (resumed === 'reference-notice' || resumed === 'reference') {
          // 판정 기준이 없으면 [촬영 시작]을 눌러도 pose-capture 가 빈 화면이 된다.
          const poseCriteria = await getPoseCriteria()
          if (!cancelled) setCriteria(poseCriteria as unknown as PoseCriteria)
        } else if (resumed === 'comparison') {
          const analysis = await getAnalysis(sessionId)
          if (cancelled) return
          setAnalysisData(analysis)
          const segmentation = await getSessionSegmentation(sessionId).catch(() => null)
          if (!cancelled) setSegmentationData(segmentation)
        } else if (resumed === 'custom-routine') {
          const routine = await getActiveRoutine(sessionId)
          if (!cancelled) setRoutineData(routine)
        } else if (resumed === 'today-routine') {
          const today = await getTodayRoutine(sessionId)
          if (!cancelled) setTodayRoutine(today)
        }
      } catch {
        // 조회 실패 — 화면은 그대로 두고 빈 상태로 보인다 (위 주석 참고)
      }
    })()
    return () => { cancelled = true }
  }, [resumedView])

  useEffect(() => {
    const handleLogoClick = () => {
      setView('onboarding')
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    }
    window.addEventListener('refit-logo-click', handleLogoClick)
    return () => window.removeEventListener('refit-logo-click', handleLogoClick)
  }, [])

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
      // 판정 방향 = 사진 방향. 갤러리 업로드는 사진에 보이는 그대로 판정한다.
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
    setAnalysisPhase(0)
    setIsAnalysisReady(false)
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
            await new Promise(resolve => window.setTimeout(resolve, 1000))
            continue
          }
          throw error
        }
      }
      if (!result) throw new Error('사진 분석이 예상보다 오래 걸리고 있어요. 잠시 후 다시 시도해주세요.')
      // 세그멘테이션 대기(409 루프)가 끝났다 — 이제부터 부위 진단이다.
      setAnalysisPhase(1)
      // ⚠️ **종합 진단까지 기다린다.** 종전에는 부위 진단 행이 써지면(partComplete)
      //    바로 빠져나왔는데, 백엔드는 그 행을 다 쓴 **뒤에야** VLM_OVERALL 을 등록한다
      //    (worker/handlers/vlm.py). 그래서 점수·요약이 아직 없는 응답을 받아 결과
      //    화면에 «-점 / 요약을 준비하고 있어요»가 떴다. 로딩이 100% 를 지나 결과가
      //    나올 차례에 빈 화면이 뜨는 게 이 화면의 최악이다.
      //    progress.completed 가 종합까지 본 신호다 — 그것만 믿는다.
      let overallFailed = false
      for (let attempt = 0; attempt < 160; attempt += 1) {
        const progress = await getAnalysisProgress(sessionId)
        // part.total 은 진단 행 수이고 백엔드가 전 부위를 한 번에 써넣는다 (0 → 9).
        // 비율이 아니라 «부위 진단이 끝났다»는 신호로만 쓴다.
        if (progress.part.total > 0) setAnalysisPhase(2)
        const status = String(progress.overall?.status ?? '').toUpperCase()
        if (status === 'FAILED' || String(progress.part.status ?? '').toUpperCase() === 'FAILED') overallFailed = true
        if (progress.completed || status === 'DONE' || overallFailed) break
        await new Promise(resolve => window.setTimeout(resolve, 750))
      }
      setAnalysisPhase(3)

      // ⚠️ 진행률이 끝났다고 응답이 곧바로 채워져 있지는 않다 (행 쓰기와 조회 사이의 틈).
      //    **실제로 그릴 수 있는지 확인하고 넘긴다** — 이게 이 화면의 약속이다.
      let analysis = await getAnalysis(sessionId)
      for (let attempt = 0; attempt < 12 && !overallFailed && !isAnalysisRenderable(analysis); attempt += 1) {
        await new Promise(resolve => window.setTimeout(resolve, 1000))
        analysis = await getAnalysis(sessionId)
      }

      // 사진·세그멘테이션도 같이 있어야 결과 화면이 채워진다. 한 번은 다시 시도한다 —
      // 실패해도 진행은 막지 않는다 (사진 없이도 수치·문구는 읽을 수 있다).
      let segmentation: SessionSegmentation | null = await fetchSegmentation(sessionId)
      if (!segmentation) segmentation = await fetchSegmentation(sessionId)

      setAnalysisData(analysis)
      setSegmentationData(segmentation)
      // 화면 전환은 여기서 하지 않는다 — 막대가 100% 를 찍은 뒤 로딩 화면이 부른다.
      setIsAnalysisReady(true)
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
      const detail = await waitForInbodyDetail(inbodyId, inbodyJobId)
      setInbodyData(detail)
      setView('inbody-form')
    } catch (error) {
      window.alert(userFacingMessage(error, '인바디 결과를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'))
    }
  }

  const verifyInbodyAndBeginAnalysis = async (patch?: InbodyPatch) => {
    try {
      if (inbodyJobId) await waitForJob(inbodyJobId)
      if (inbodyId) await patchInbody(inbodyId, { ...(patch ?? {}), verified: true })
      await beginAnalysis()
    } catch (error) {
      window.alert(userFacingMessage(error, '인바디 정보를 확인하지 못했습니다. 입력값을 다시 확인해주세요.'))
    }
  }

  const beginRoutine = async () => {
    const sessionId = getStoredSessionId()
    if (!sessionId) return
    setRoutinePhase(0)
    setIsRoutineReady(false)
    setView('loading-two')
    try {
      const result = await createRoutine(sessionId, workoutDays)
      const jobId = getJobId(result)
      // ⚠️ 루틴 생성 잡은 PENDING/PROCESSING/DONE 셋뿐이다 — 한 번의 LLM 호출이라
      //    쪼갤 중간 지점이 서버에도 없다. 있는 신호를 그대로 단계로 옮긴다.
      if (jobId) await waitForJob(jobId, status => setRoutinePhase(status === 'PROCESSING' ? 2 : 1))
      setRoutinePhase(3)
      const routine = await getActiveRoutine(sessionId)
      setRoutineData(routine)
      // 전환은 막대가 100% 를 찍은 뒤 로딩 화면이 시작한다.
      setIsRoutineReady(true)
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
  /**
   * 활성 루틴을 다시 받아 진행률을 최신으로 만든다.
   *
   * ⚠️ 운동 완료를 기록한 뒤 **반드시** 불러야 한다. 진행률(0/16회, %)은
   *    routineData 에서 오는데 완료 기록은 «오늘 루틴»만 갱신했다. 그래서 운동을
   *    마쳐도 맞춤 루틴 화면의 숫자가 그대로 0/16 에 머물렀다.
   * ⚠️ 조회가 실패해도 화면을 막지 않는다 — 옛 숫자가 잠깐 남을 뿐이다.
   */
  const refreshRoutine = async () => {
    const sessionId = getStoredSessionId()
    if (!sessionId) return
    try { setRoutineData(await getActiveRoutine(sessionId)) } catch { /* 옛 값 유지 */ }
  }

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
    // 기록이 남았으니 진행률도 같이 올린다 (위 주석 참고)
    await refreshRoutine()
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

  if (view === 'reference-notice' || view === 'reference') return <ReferenceScreen
    ready={Boolean(refData)} busy={refBusy} error={refError}
    showNotice={view === 'reference-notice'}
    onConfirm={() => setView('reference')}
    onPrevious={() => setView('onboarding')}
    onSelectFile={file => void handleReferenceFile(file)}
    onStart={() => setView('pose-capture')} />
  if (view === 'pose-capture') return refData && criteria
    ? <PoseCaptureScreen sessionId={getStoredSessionId() ?? ''} criteria={criteria}
        refLm={refData.pose.landmarks as PoseLandmarks} refAspect={refData.aspect} refScaleBasis={refData.pose.scaleBasis} referenceUrl={refData.url}
        onNext={() => setView('inbody-upload')}
        onPrevious={() => setView('reference')}
        onBrowse={file => void uploadUser(file)} />
    : null
  if (view === 'pose-analyzing') return <PoseScreen result="loading" score={poseEvaluation?.pose_similarity ?? 0} referenceUrl={refData?.url ?? null} userPhoto={lastUserPhoto} onRetry={retrySamePhoto} onBrowse={file => void uploadUser(file)} onLive={() => setView('pose-capture')} onNext={() => undefined} onPrevious={() => setView('reference')} />
  if (view === 'pose-failure') return <PoseScreen result="failure" score={poseEvaluation?.pose_similarity ?? 0} message={poseMessage} referenceUrl={refData?.url ?? null} userPhoto={lastUserPhoto} onRetry={retrySamePhoto} onBrowse={file => void uploadUser(file)} onLive={() => setView('pose-capture')} onNext={() => undefined} onPrevious={() => setView('reference')} />
  if (view === 'pose-unavailable') return <PoseScreen result="unavailable" score={poseEvaluation?.pose_similarity ?? 0} message={poseMessage} referenceUrl={refData?.url ?? null} userPhoto={lastUserPhoto} onRetry={retrySamePhoto} onBrowse={file => void uploadUser(file)} onLive={() => setView('pose-capture')} onNext={() => undefined} onPrevious={() => setView('reference')} />
  if (view === 'pose-success') return <PoseScreen result="success" score={poseEvaluation?.pose_similarity ?? 100} referenceUrl={refData?.url ?? null} userPhoto={lastUserPhoto} onRetry={() => undefined} onBrowse={file => void uploadUser(file)} onLive={() => setView('pose-capture')} onNext={() => setView('inbody-upload')} onPrevious={() => setView('reference')} />
  if (view === 'inbody-upload') return <><input ref={inbodyFileInputRef} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => { const file = event.currentTarget.files?.[0]; if (file) void handleInbodyFile(file); event.currentTarget.value = '' }} /><InbodyUploadBeforeScreen onUpload={() => inbodyFileInputRef.current?.click()} onComplete={() => void beginAnalysis()} onSkip={() => void beginAnalysis()} onPrevious={() => setView('pose-success')} /></>
  if (view === 'inbody-uploaded') return <InbodyUploadSuccessScreen onChangePhoto={() => setView('inbody-upload')} onStart={openInbodyConfirmation} onSkip={() => void beginAnalysis()} onPrevious={() => setView('inbody-upload')} />
  if (view === 'inbody-form') return <InbodyUploadAfterScreen inbody={inbodyData} onConfirm={patch => void verifyInbodyAndBeginAnalysis(patch)} onPrevious={() => setView('inbody-uploaded')} />
  if (view === 'inbody-range-error') return <InbodyRangeErrorScreen onConfirm={() => void verifyInbodyAndBeginAnalysis()} onPrevious={() => setView('inbody-form')} />
  if (view === 'inbody-warning') return <InbodyValidationWarningScreen onConfirm={() => void verifyInbodyAndBeginAnalysis()} onPrevious={() => setView('inbody-range-error')} />
  if (view === 'inbody-fixed') return <InbodyAllErrorsFixedScreen onConfirm={() => void verifyInbodyAndBeginAnalysis()} onPrevious={() => setView('inbody-warning')} />
  if (view === 'inbody-unreadable') return <InbodyUnreadableScreen onConfirm={() => setView('inbody-form')} onPrevious={() => setView('inbody-uploaded')} />
  // 로딩 애니메이션이 100%가 되면 분석 화면으로 전환한다. 결과 API는 백그라운드에서
  // 이어서 받아 상태를 채우므로, 네트워크 응답 때문에 로딩 화면이 멈춰 있지 않는다.
    if (view === 'inbody-loading') return <LoadingOneScreen phase={analysisPhase} isComplete={isAnalysisReady} onComplete={() => setView('comparison')} />
  if (view === 'comparison') return <ComparisonAnalysisScreen analysis={analysisData} segmentation={segmentationData} onCreateRoutine={() => setView('exercise-days')} onPrevious={() => setView('inbody-uploaded')} />
  if (view === 'exercise-days') return <ExerciseDaysScreen days={workoutDays} onDaysChange={setWorkoutDays} onNext={() => void beginRoutine()} onPrevious={() => setView('comparison')} />
  if (view === 'loading-two') return <LoadingTwoScreen phase={routinePhase} isComplete={isRoutineReady} onComplete={() => setView('custom-routine')} />
  if (view === 'custom-routine') return <CustomRoutineScreen routine={routineData} onAdjustDays={() => setView('exercise-days')} onViewDay={day => { setSelectedDay(day); setView('custom-routine-detail') }} onNext={() => void openTodayRoutine()} />
  if (view === 'custom-routine-detail') return <CustomRoutineDetailScreen day={selectedDay} onPrevious={() => setView('custom-routine')} />
  if (view === 'today-routine') return <TodayRoutineScreen today={todayRoutine} onFinish={() => setView('feedback')} onPrevious={() => { void refreshRoutine(); setView('custom-routine') }} />
  if (view === 'feedback') return <FeedbackScreen onSubmit={message => void completeWorkout(message)} onSkip={() => void completeWorkout()} />
  if (view === 'feedback-loading') return <FeedbackLoadingScreen feedback={feedbackMessage} onComplete={() => undefined} />
    if (view === 'feedback-attention-area') return <FeedbackAttentionAreaScreen userMessage={feedbackMessage} coach={coach} onSubmit={message => void continueCoach(message)} onExit={() => setView('today-routine')} />
    if (view === 'feedback-exercise-intensity') return <FeedbackExerciseIntensityScreen userMessage={feedbackMessage} coach={coach} onSubmit={message => void continueCoach(message)} onExit={() => setView('today-routine')} />
  if (view === 'feedback-reflection') return <FeedbackReflectionScreen finalized={coach?.finalized ?? null} onApply={() => void applyCoach()} onKeep={() => setView('feedback-kept')} />
  if (view === 'feedback-applied') return <FeedbackAppliedScreen onViewRoutine={() => void viewChangedRoutine()} />
  if (view === 'feedback-kept') return <FeedbackKeptScreen />
  return <main className="onboarding"><OnboardingOne /><OnboardingTwo /><OnboardingThree /><OnboardingFour onStart={openReference} /></main>
}

export default App
