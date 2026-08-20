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
import { applyCoachChanges, archiveSession, createRoutine, createWorkoutLog, deleteInbody, getActiveRoutine, getAnalysis, getAnalysisProgress, getInbody, getJob, getPoseCriteria, getSessionPhoto, getSessionSegmentation, getStoredAnalysisMode, getStoredSessionId, getTodayRoutine, patchInbody, RefitApiError, sendCoachMessage, setStoredAnalysisMode, startAnalysis, startQuickAnalysis, uploadInbody, uploadReferencePhoto, uploadUserPhoto, userFacingMessage, ensureActiveSession, type AnalysisResult, type CoachChatMessage, type CoachChatResponse, type InbodyDetail, type Job, type RoutineDay, type RoutineDetail, type SessionSegmentation, type TodayRoutine } from './lib/api'
import { detectPoseFromImage, type DetectedPose } from './lib/pose-detector'
import { loadVideoLandmarker } from './lib/landmarkers'
import { evaluate, MESSAGES, type PoseCriteria, type PoseEvaluation, type PoseLandmarks } from './lib/pose-score.js'
import { viewportScale } from './lib/viewport-scale'

// 부분 신체(상체/하체만) 레퍼런스를 허용하므로 "전신이 보이도록"은 부정확하다.
// MESSAGES는 교체 가능하게 export되어 있고 evaluate()가 이 표를 그대로 읽는다.
MESSAGES.NOT_ENOUGH_JOINTS = '레퍼런스에 나온 부위가 보이도록 서주세요.'

const SCALE_BASIS_GUIDE = '레퍼런스와 같은 부위가 나오도록 촬영해 주세요. 계속 어려우면 레퍼런스를 다시 등록해 주세요.'
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
/** 히어로 배경·인물은 각각 2MB 급 PNG 다. JSX 로 렌더될 때까지 기다리면 그만큼
 *  늦게 도착해서 등장 애니메이션도 그만큼 밀린다. 모듈이 평가되는 즉시 —
 *  즉 첫 렌더보다 먼저 — 내려받기를 걸어둔다. */
for (const source of [heroBackground, heroPhone]) {
  const preload = new Image()
  preload.src = source
}

const REVEAL_OBSERVER: IntersectionObserverInit = { threshold: 0, rootMargin: '0px 0px -45% 0px' }

/** 잠깐 스쳐 가는 화면 — 뒤로가기 기록에 남기지 않는다. */
const TRANSIENT_VIEWS: AppView[] = ['pose-analyzing', 'inbody-loading', 'loading-two', 'feedback-loading']

/** 분석 폴링 간격. 오래 걸릴 때는 서버를 덜 두드린다. */
const ANALYSIS_POLL_MS = 750
const ANALYSIS_SLOW_POLL_MS = 2500
/** 이 시간을 넘기면 «조금 더 걸리고 있어요» 안내를 띄운다 — 포기가 아니라 안내다. */
const ANALYSIS_SLOW_NOTICE_MS = 30_000
/** 조회가 연달아 이만큼 실패하면 «다시 시도»를 내준다 (서버 다운·네트워크). */
/** 결과가 빈 채로 완료됐을 때 조용히 다시 걸어보는 횟수. 그 뒤로는 폴링만 계속한다. */
const ANALYSIS_MAX_RERUNS = 2

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

/** 섹션 안의 이미지가 다 그려질 때까지 기다렸다가 실행한다.
 *
 *  ⚠️ 이게 없으면 등장 애니메이션이 **빈 자리에서 혼자 끝난다**. 히어로 배경·인물은
 *     2MB 짜리 PNG 라, 화면 진입을 감지한 시점엔 아직 내려받는 중이다. 전환은
 *     제 시간에 끝나고 사진은 그 뒤에 도착해서, 사용자에게는 «PNG 가 위에서부터
 *     그려지는» 모습만 보인다 (사용자 신고 2026-08-20).
 *
 *  ⚠️ 상한을 둔다. 이미지 하나가 끝내 안 오면 화면이 영영 opacity 0 으로 남는다 —
 *     애니메이션을 못 보는 것보다 화면이 안 나오는 쪽이 훨씬 나쁘다. */
const REVEAL_IMAGE_TIMEOUT_MS = 2500

function whenImagesReady(section: HTMLElement, start: () => void) {
  const pending = Array.from(section.querySelectorAll('img')).filter(image => !image.complete)
  if (!pending.length) { start(); return () => {} }
  let done = false
  const run = () => { if (!done) { done = true; start() } }
  const timer = window.setTimeout(run, REVEAL_IMAGE_TIMEOUT_MS)
  void Promise.all(pending.map(image => new Promise<void>(resolve => {
    image.addEventListener('load', () => resolve(), { once: true })
    image.addEventListener('error', () => resolve(), { once: true })
  }))).then(() => { window.clearTimeout(timer); run() })
  return () => window.clearTimeout(timer)
}

/** Reveals a design section once it reaches the viewport. */
function RevealSection({ children, className, label, scaleToViewport = false, designHeight = 1024 }: SectionProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [scale, setScale] = useState(() => viewportScale(1440))

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    let cancelWait = () => {}
    const observer = new IntersectionObserver(([entry]) => {
      // 이미 지나친 섹션(새로고침 스크롤 복원)도 즉시 드러낸다 — 안 그러면 영영 opacity 0
      if (!entry.isIntersecting && entry.boundingClientRect.top >= 0) return
      observer.unobserve(entry.target)
      // 사진이 도착한 뒤에 시작해야 등장 애니메이션이 실제로 보인다.
      cancelWait = whenImagesReady(section, () => setIsVisible(true))
    }, REVEAL_OBSERVER)
    observer.observe(section)
    return () => { observer.disconnect(); cancelWait() }
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
      <p className="step-description">원하는 체형의 사진을 등록하면 AI가 차이를 분석합니다.</p>
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
            ? <><img className="reference-dropzone__done" src={referenceUploaded} alt="" /><img className="reference-dropzone__check" src={referenceUploadSuccessCheck} alt="" /><strong>사진이 업로드되었습니다!</strong><span>다른 사진으로 변경하려면 클릭하세요</span></>
            : <><img src={referenceUpload} alt="" /><p>파일을 선택하거나 여기로 끌어다 놓으세요.</p></>}
      </button>
      {error && <p className="reference-error" role="alert">{error}</p>}
      <button className={`reference-start ${ready ? 'is-ready' : ''}`} type="button" disabled={!ready || busy} onClick={onStart}>다음으로</button>
      {showNotice && <>
        {/* 막이 뒤를 덮어 시선을 모으고, 확인을 누르기 전에는 업로드가 눌리지 않게 한다 */}
        <div className="reference-notice-veil" aria-hidden="true" />
        <section className="reference-notice" role="dialog" aria-modal="true" aria-labelledby="reference-notice-title">
          <span className="reference-notice__icon"><img src={referenceInfo} alt="" /></span>
        <h2 id="reference-notice-title">레퍼런스 주의 사항 안내</h2>
        <p>해당 레퍼런스 이미지에 있는 부위에 대한 루틴만 제공되오니<br />신중하게 업로드해 주시길 바랍니다.</p>
          <button type="button" autoFocus onClick={onConfirm}>확인</button>
        </section>
      </>}
  </div></FixedStepFrame>
}

function PoseCorners() {
  return <><img className="pose-corner pose-corner--top-left" src={poseCornerTopLeft} alt="" /><img className="pose-corner pose-corner--top-right" src={poseCornerTopRight} alt="" /><img className="pose-corner pose-corner--bottom-left" src={poseCornerBottomLeft} alt="" /><img className="pose-corner pose-corner--bottom-right" src={poseCornerBottomRight} alt="" /></>
}


function PoseStatus({ result, message, onRetry, onBrowse }: { result: 'loading' | 'failure' | 'success' | 'unavailable'; message?: string; onRetry: () => void; onBrowse: () => void }) {
  if (result === 'loading') return <div className="pose-status pose-status--loading" aria-live="polite"><span className="loading-dot">•</span><span className="loading-dot">•</span><span className="loading-dot">•</span><p>AI가 일치도를 분석하고 있어요!</p></div>
  const success = result === 'success'
  const unavailable = result === 'unavailable'
  return <div className={`pose-status pose-status--${success ? 'success' : 'failure'}`}>
    <span className="pose-status__symbol">{success ? <img src={poseSuccessCheck} alt="" /> : <><img src={poseFailLineOne} alt="" /><img src={poseFailLineTwo} alt="" /></>}</span>
    <strong>{success ? '사진이 업로드되었습니다!' : message || (unavailable ? '사진 확인을 잠시 진행할 수 없어요.' : '레퍼런스의 포즈와 일치하지 않아요!')}</strong>
    <small>{success ? '다른 사진으로 바꾸려면 재업로드해 주세요' : unavailable ? '같은 사진으로 잠시 후 다시 시도해 주세요' : '다시 업로드해 주세요'}</small>
    <button type="button" onClick={unavailable ? onRetry : onBrowse}>{unavailable ? '다시 시도' : '재업로드'}</button>
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
      <p className="step-description">레퍼런스와 같은 포즈로 자신의 체형을 업로드해 주세요.</p><PreviousButton onClick={onPrevious} />
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

/**
 * inbody.status 를 기다린다 — **완료 판정은 이 값 하나뿐이어야 한다.**
 *
 * ⚠️ 예전엔 "fields·smi·segments 중 아무거나 값이 있으면 완료"로 추측했다.
 *    OCR_INBODY 핸들러가 컬럼(fields)과 segments 를 **두 번의 별도 DB 쓰기**로
 *    커밋하므로(worker/handlers/ocr.py), 그 사이 타이밍에 폴링이 걸리면
 *    한쪽만 채워진 반쪽짜리 스냅샷을 "완료"로 오판해 폴링을 멈춘다 — 이후
 *    다시 조회하지 않으니 화면은 그 반쪽 상태에 영구히 갇힌다(실측: 체성분은
 *    비어 있는데 부위별 근육량만 채워진 확인 화면). status='DONE'은 두 쓰기가
 *    다 끝난 뒤에만 찍히므로 이것만 신뢰한다.
 */
async function waitForInbodyDetail(inbodyId: string): Promise<InbodyDetail> {
  let lastReadError: unknown = null
  for (let attempt = 0; attempt < 120; attempt += 1) {
    let detail: InbodyDetail | null = null
    try {
      detail = await getInbody(inbodyId)
    } catch (error) {
      lastReadError = error
    }
    if (detail?.status === 'DONE') return detail
    if (detail?.status === 'FAILED') throw new Error('인바디 추출에 실패했습니다.')
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
  // ⚠️ overall 은 null 일 수 있다 (진단 행 생성 전). status 를 먼저 읽으면 터진다.
  //    판정 기준은 백엔드 계약 그대로 — overall 이 있고 status 가 DONE 일 때만 «그릴 수 있음».
  return analysis?.overall != null && analysis.overall.status === 'DONE'
}

/** 원본 사진 URL 두 장 — **세그멘테이션이 없을 때 사진만이라도** 보여주기 위한 것.
 *  퀵/웹캠 경로는 Sapiens2 를 안 돌려 세그가 없지만 photo 행은 있다. 실패해도
 *  화면을 막지 않는다 — 사진이 없으면 비교 이미지 섹션만 빠진다. */
async function fetchPhotoUrls(sessionId: string): Promise<{ user: string | null; reference: string | null }> {
  const [user, reference] = await Promise.all([
    getSessionPhoto(sessionId, 'user').then(p => p.signed_url ?? null).catch(() => null),
    getSessionPhoto(sessionId, 'reference').then(p => p.signed_url ?? null).catch(() => null),
  ])
  return { user, reference }
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
  // 세그가 없는 경로(퀵/웹캠)에서 사진만이라도 그리기 위한 원본 URL.
  const [photoUrls, setPhotoUrls] = useState<{ user: string | null; reference: string | null } | null>(null)
  const [routineData, setRoutineData] = useState<RoutineDetail | null>(null)
  const [selectedDay, setSelectedDay] = useState<RoutineDay | null>(null)
  const [coach, setCoach] = useState<CoachChatResponse | null>(null)
  // 로딩 화면 진행률 — 화면이 스스로 시간을 재지 않고 **여기서 실제 단계를 받아 간다.**
  // ⚠️ ...Ready 는 결과까지 다 받은 뒤에만 true 로 만든다. 이걸 먼저 켜면 진행률이
  //    다시 거짓말을 하게 되고, 그게 이 화면들을 고친 이유였다.
  const [analysisPhase, setAnalysisPhase] = useState(0)
  /** 지금 유효한 분석 실행 번호. 상한 없는 폴링 루프를 화면 이탈 시 끊는 데 쓴다. */
  const analysisRunRef = useRef(0)
  const [isAnalysisReady, setIsAnalysisReady] = useState(false)
  /** 로딩 화면에 띄울 안내(오래 걸림) / 실패 문구. 실패면 «다시 시도»가 같이 뜬다. */
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
          // ⚠️ 점수·요약이 없는 응답을 그대로 꽂으면 «—점 / 요약을 준비하고 있어요»가
          //    사용자에게 보인다. 그럴 땐 결과 화면을 채우지 말고 **정상 분석 흐름**으로
          //    돌린다 — 로딩 화면을 띄우고 폴링해서, 다 갖춰졌을 때 결과로 넘긴다.
          if (!isAnalysisRenderable(analysis)) { void beginAnalysis(); return }
          setAnalysisData(analysis)
          const segmentation = await getSessionSegmentation(sessionId).catch(() => null)
          if (!cancelled) setSegmentationData(segmentation)
          const urls = await fetchPhotoUrls(sessionId)
          if (!cancelled) setPhotoUrls(urls)
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

  // 단축키 리셋(시연용) — Cmd/Ctrl+Shift+X. archive_session 은 이미 백엔드에
  // 있었지만(F03, "사용자당 ACTIVE 세션 1개" 제약을 벗어나는 유일한 공식 통로)
  // 부르는 화면이 하나도 없어서, 지금까지는 시크릿 창을 새로 여는 것만이 새
  // 세션(새 user_id)을 받는 방법이었다. 여기서는 user_id 는 그대로 두고
  // 세션만 ARCHIVED 로 내린다 — 다음 ensureActiveSession() 이 활성 세션
  // 없음(404)을 보고 알아서 새로 만든다.
  // ⚠️ Cmd/Ctrl+Shift+R(하드 리프레시)은 브라우저 예약 단축키라 페이지 JS로
  //    가로챌 수 없다 — 겹치지 않는 X 로 잡았다.
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || !e.shiftKey || e.key.toLowerCase() !== 'x') return
      e.preventDefault()
      if (!window.confirm('현재 세션을 종료하고 처음부터 새로 시작할까요?')) return
      const sessionId = getStoredSessionId()
      if (sessionId) void archiveSession(sessionId).catch(() => undefined)
      setAnalysisData(null)
      setSegmentationData(null)
      setInbodyId(null)
      setInbodyJobId(null)
      setInbodyData(null)
      setRoutineData(null)
      setSelectedDay(null)
      setTodayRoutine(null)
      setCoach(null)
      setRefData(null)
      setView('onboarding')
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    }
    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
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
      // 갤러리 업로드 = 기존 세그 파이프라인. 웹캠(quick)을 쓰다 갤러리로 갈아탔으면
      // 마지막으로 올라간 사진이 기준이므로 여기서 full 로 되돌린다.
      setStoredAnalysisMode('full')
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

  /**
   * 분석 시작 → 완료까지 기다렸다가 결과 화면으로 넘긴다.
   *
   * ⚠️ **로딩 화면에는 «잠시만 기다려주세요!» 말고 아무 문구도 띄우지 않는다.**
   *    지연·연결 불안정·분석 실패 같은 말은 전부 서버 사정이지 사용자가 할 수 있는
   *    일이 아니다. 읽어도 손쓸 데가 없는 문구는 «뭔가 고장났다»는 인상만 남긴다.
   *    그래서 사정은 **화면에 옮기지 않고 여기서 직접 수습한다** — 조회가 실패하면
   *    간격을 늘려 계속 두드리고, 결과가 비어 있으면 조용히 분석을 다시 건다.
   *
   * ⚠️ **«—점 / 요약을 준비하고 있어요»가 최종 상태로 남으면 안 된다.** 대기에 상한을
   *    두고 데이터 없이 결과 화면으로 넘기던 탓에 새로고침을 해야 점수가 나왔다.
   *    넘어가는 조건은 **결과를 실제로 손에 쥐었을 때 하나**다.
   */
  const beginAnalysis = async (force = false) => {
    const sessionId = getStoredSessionId()
    if (!sessionId) return
    // 이 실행의 표. 사용자가 로고를 눌러 나가거나 분석을 다시 걸면 옛 실행은 여기서 끊긴다
    // — 상한이 없는 루프라 표가 없으면 화면을 떠난 뒤에도 계속 돌며 setView 를 때린다.
    const run = analysisRunRef.current + 1
    analysisRunRef.current = run
    const alive = () => analysisRunRef.current === run
    // 웹캠 촬영(quick)인지 갤러리 업로드(full)인지는 마지막 사용자 사진 업로드가 기록했다.
    // 퀵은 세그·부위 진단이 없다: 시작은 mode=quick, 부위 신호·세그 조회를 건너뛴다.
    // 결과 화면은 모드 플래그 없이 데이터로 분기한다 (부위 0건 · 점수 null).
    const quick = getStoredAnalysisMode() === 'quick'

    setAnalysisPhase(0)
    // ⚠️ 단계는 **앞으로만 간다.** 조회 실패나 재시동으로 되돌리면 게이지가 뒤로 흐르는데,
    //    사용자에게는 진행이 취소된 것처럼 보인다. 실제로 다시 하더라도 화면은 멈춰만 있게 한다.
    const advancePhase = (next: number) => setAnalysisPhase(current => Math.max(current, next))
    setIsAnalysisReady(false)
    setView('inbody-loading')

    const startedAt = Date.now()
    /** 연속 실패 수. 늘어날수록 폴링 간격만 늘린다 — 포기하지도, 알리지도 않는다. */
    let failures = 0

    const waitTick = async () => {
      const slow = Date.now() - startedAt > ANALYSIS_SLOW_NOTICE_MS || failures > 0
      await new Promise(resolve => window.setTimeout(resolve, slow ? ANALYSIS_SLOW_POLL_MS : ANALYSIS_POLL_MS))
    }

    /** 분석을 처음부터 다시 건다. 409(세그 대기)는 에러가 아니라 «기다리라»는 뜻이다. */
    const kickOff = async (retry: boolean) => {
      for (;;) {
        if (!alive()) return false
        try { await (quick ? startQuickAnalysis(sessionId, retry) : startAnalysis(sessionId, retry)); return true } catch (error) {
          if (error instanceof RefitApiError && error.code === 'INSUFFICIENT_PARTS') throw error
          if (!(error instanceof RefitApiError) || error.status !== 409) failures += 1
          await waitTick()
        }
      }
    }

    try {
      // ── ① 분석 시작
      if (!await kickOff(force)) return
      advancePhase(1)

      /** 진단 행이 빈 채로 completed 가 뜨면 몇 번까지 조용히 다시 걸어볼지. */
      let reruns = 0

      for (;;) {
        // ── ② progress.completed 까지 기다린다. 상한 없음.
        for (;;) {
          if (!alive()) return
          let progress
          try { progress = await getAnalysisProgress(sessionId); failures = 0 }
          catch { failures += 1; await waitTick(); continue }
          // part.total 은 «부위 진단이 끝났다»는 신호로만 쓴다 (0 → 9 로 한 번에 뛴다).
          // 퀵은 부위 단계가 아예 없어 항상 0 이다 — 이 신호를 기다리지 않는다.
          if (quick || progress.part.total > 0) advancePhase(2)
          if (progress.completed) break
          await waitTick()
        }
        advancePhase(3)

        // ── ③ completed 를 봤으면 결과는 **이미 커밋돼 있다.** 한 번 읽고 판정한다.
        //
        // ⚠️ 유예를 두지 않는다 (백엔드 확인 2026-08-19). 워커가 진단 행을 먼저 쓰고
        //    그 핸들러가 끝나야 잡이 DONE 이 되므로, 쓰기/읽기 틈이 없다.
        //
        // ⚠️ 단 completed=true 가 «overall 이 있다»를 뜻하지는 않는다. 실패 모양이 셋이다.
        //      종합 성공     → 행 있음 · status=DONE
        //      전 부위 실패  → 행 있음 · status=FAILED
        //      부위 진단 실패/종합 미시작 → overall 이 아예 null
        //    DONE 이 아니면 (null 이든 FAILED 든) 결과가 없는 것이고, 그때는 «실패했어요»를
        //    보이는 대신 force 로 다시 건다. 사용자가 [다시 시도]로 할 일을 대신 하는 것뿐이다.
        // ⚠️ 조회 실패는 **여기서** 다시 읽는다. 바깥 루프로 돌려보내면 진행률 폴링을
        //    다시 타면서 단계가 3 → 2 로 내려가고, 게이지가 눈에 띄게 뒤로 흐른다.
        let analysis: AnalysisResult | null = null
        for (;;) {
          if (!alive()) return
          try { analysis = await getAnalysis(sessionId); failures = 0; break }
          catch { failures += 1; await waitTick() }
        }

        if (isAnalysisRenderable(analysis)) {
          setAnalysisData(analysis)
          // 사진이 없어도 수치·문구는 읽을 수 있다 — 한 번 더 시도하고 없으면 그냥 간다.
          // 퀵은 세그멘테이션이 아예 없다 — 조회해 봐야 10초 타임아웃만 기다린다.
          setSegmentationData(quick ? null : (await fetchSegmentation(sessionId) ?? await fetchSegmentation(sessionId)))
          if (!alive()) return
          // 세그가 없어도(퀵) 사진은 보여준다 — 없으면 빈 상자만 남는다.
          setPhotoUrls(await fetchPhotoUrls(sessionId))
          if (!alive()) return
          setIsAnalysisReady(true)   // 막대가 100% 를 찍은 뒤 로딩 화면이 전환한다
          return
        }

        // 다시 걸어도 계속 비어 있으면 서버 쪽 문제다. 그래도 화면에 옮기지 않는다 —
        // 폴링만 계속 돌려 두면 워커가 살아나는 순간 사용자는 그냥 결과를 받게 된다.
        if (reruns < ANALYSIS_MAX_RERUNS) { reruns += 1; if (!await kickOff(true)) return }
        else await waitTick()
      }
    } catch (error) {
      // 비교 가능한 부위가 부족하면 사진 문제 — 이건 사용자가 손쓸 수 있으니 재촬영으로 유도한다
      if (error instanceof RefitApiError && error.code === 'INSUFFICIENT_PARTS' && alive()) {
        window.alert(error.message)
        setView('pose-capture')
      }
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
      const detail = await waitForInbodyDetail(inbodyId)
      setInbodyData(detail)
      setView('inbody-form')
    } catch (error) {
      window.alert(userFacingMessage(error, '인바디 결과를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'))
    }
  }

  /** [건너뛰기] — 업로드 전/후 화면 둘 다 이걸 쓴다. 업로드했다가 뒤로 가서
   *  건너뛰면(inbodyId 는 상태에 남아있다) OCR로 이미 DONE 행이 생겼으므로,
   *  그냥 넘어가면 세션에 인바디가 계속 붙어있는 채로 남는다(다음 분석에도
   *  계속 반영됨). "건너뛴다"는 의도를 실제로 지운다. 업로드 전 화면의
   *  [건너뛰기]가 beginAnalysis 를 직접 불러 이 삭제를 건너뛰던 게 실제
   *  버그였다 — "건너뛰기를 눌렀는데 인바디 수치가 결과에 반영된다"는
   *  증상으로 나타났다. */
  const skipInbody = async () => {
    const id = inbodyId
    setInbodyId(null)
    setInbodyJobId(null)
    if (id) {
      try {
        await deleteInbody(id)
      } catch {
        // 삭제 실패해도 분석은 막지 않는다 — 인바디는 선택 입력이다.
      }
    }
    await beginAnalysis()
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
      // feedback-loading 을 거치지 않고 바로 대화 화면으로 — coach 가 아직
      // null 이어도 이 화면은 "코치가 확인하고 있어요" 자리표시자를 보여준다
      // (아래 sendCoach 참고). 중간 화면을 왕복하면 대화창이 매번 다시
      // 마운트되어 화면이 깜빡인다.
      setView('feedback-attention-area')
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
      // ⚠️ 2턴째부터 다른 화면(feedback-exercise-intensity)으로 바꾸지 않는다
      //    (2026-08-18 정정). 턴마다 컴포넌트가 통째로 마운트 해제·재마운트되면
      //    대화가 카톡처럼 안 쌓이고 화면이 매번 바뀌는 것처럼 보인다 — 대화
      //    내내 같은 화면(feedback-attention-area) 하나를 유지해야 스크롤되는
      //    누적 대화 이력이 유지된다.
      setView(response.finalized ? 'feedback-reflection' : 'feedback-attention-area')
    } catch (error) {
      window.alert(userFacingMessage(error, '코치와 연결하지 못했어요. 잠시 후 다시 시도해주세요.'))
      await openTodayRoutine()
    }
  }

  const continueCoach = async (text: string) => {
    if (!coach) return
    setFeedbackMessage(text)
    // 화면을 안 바꾼다 — 이미 feedback-attention-area 다. 응답을 기다리는 동안
    // 화면(=대화 이력)을 그대로 유지하는 게 이번 수정의 핵심이다.
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
  if (view === 'inbody-upload') return <><input ref={inbodyFileInputRef} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => { const file = event.currentTarget.files?.[0]; if (file) void handleInbodyFile(file); event.currentTarget.value = '' }} /><InbodyUploadBeforeScreen onUpload={() => inbodyFileInputRef.current?.click()} onComplete={() => void beginAnalysis()} onSkip={() => void skipInbody()} onPrevious={() => setView('pose-success')} /></>
  if (view === 'inbody-uploaded') return <InbodyUploadSuccessScreen onChangePhoto={() => setView('inbody-upload')} onStart={openInbodyConfirmation} onSkip={() => void skipInbody()} onPrevious={() => setView('inbody-upload')} />
  if (view === 'inbody-form') return <InbodyUploadAfterScreen inbody={inbodyData} onConfirm={patch => void verifyInbodyAndBeginAnalysis(patch)} onPrevious={() => setView('inbody-uploaded')} />
  if (view === 'inbody-range-error') return <InbodyRangeErrorScreen onConfirm={() => void verifyInbodyAndBeginAnalysis()} onPrevious={() => setView('inbody-form')} />
  if (view === 'inbody-warning') return <InbodyValidationWarningScreen onConfirm={() => void verifyInbodyAndBeginAnalysis()} onPrevious={() => setView('inbody-range-error')} />
  if (view === 'inbody-fixed') return <InbodyAllErrorsFixedScreen onConfirm={() => void verifyInbodyAndBeginAnalysis()} onPrevious={() => setView('inbody-warning')} />
  if (view === 'inbody-unreadable') return <InbodyUnreadableScreen onConfirm={() => setView('inbody-form')} onPrevious={() => setView('inbody-uploaded')} />
  // 로딩 애니메이션이 100%가 되면 분석 화면으로 전환한다. 결과 API는 백그라운드에서
  // 이어서 받아 상태를 채우므로, 네트워크 응답 때문에 로딩 화면이 멈춰 있지 않는다.
    if (view === 'inbody-loading') return <LoadingOneScreen phase={analysisPhase} isComplete={isAnalysisReady}
      onComplete={() => setView('comparison')} />
  // ⚠️ 점수·요약이 다 있을 때만 결과 화면을 그린다. 사용자가 «—점» 이나
  //    «요약을 준비하고 있어요» 를 보는 일이 없어야 한다 — 로딩 화면의 존재 이유다.
  //    새로고침 복원처럼 로딩을 안 거치고 들어오는 길이 있어서 여기서 한 번 더 막는다.
  if (view === 'comparison' && !isAnalysisRenderable(analysisData))
    return <LoadingOneScreen phase={analysisPhase} isComplete={isAnalysisReady} onComplete={() => setView('comparison')} />
  if (view === 'comparison') return <ComparisonAnalysisScreen analysis={analysisData} segmentation={segmentationData} photoUrls={photoUrls} onCreateRoutine={() => setView('exercise-days')} onPrevious={() => setView('inbody-uploaded')} />
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
  if (view === 'feedback-kept') return <FeedbackKeptScreen onNext={() => void openTodayRoutine()} />
  return <main className="onboarding"><OnboardingOne /><OnboardingTwo /><OnboardingThree /><OnboardingFour onStart={openReference} /></main>
}

export default App
