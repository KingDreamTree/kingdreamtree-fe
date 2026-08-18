import { useEffect, useRef, type CSSProperties } from 'react'
import loadingTwoActiveRing from '../assets/loading2-active-ring.svg'
import loadingTwoActiveGlow from '../assets/loading2-active-step.svg'
import loadingTwoConnector from '../assets/loading2-connector.svg'
import loadingTwoIdleStep from '../assets/loading2-idle-step.svg'
import loadingTwoProgressFill from '../assets/loading2-progress-fill.svg'
import loadingTwoProgressTrack from '../assets/loading2-progress-track.svg'
import loadingTwoRunner from '../assets/loading2-runner.png'
import loadingTwoRunnerIcon from '../assets/loading2-running-icon.svg'
import loadingTwoShadow from '../assets/loading2-shadow.svg'
import loadingTwoStepCheck from '../assets/loading2-step-check.svg'
import { FixedStepFrame } from '../components/FixedStepFrame'
import { useLoadingProgress } from '../lib/use-loading-progress'

const loadingSteps = ['체형 데이터를 불러오는 중...', '레퍼런스와 비교 분석 중...', 'AI가 체형을 분석 중...', '분석 결과를 정리하는 중...']

/**
 * phase       지금 어느 단계인가 (0~3). App 이 실제 서버 진행 상황을 보고 올려준다.
 * isComplete  결과까지 다 받았는가. **이게 오기 전에는 100%가 되지 않는다.**
 * onComplete  100% 를 찍은 뒤 호출된다 — 화면 전환은 여기서 시작한다.
 * notice      오래 걸릴 때 띄우는 안내. ⚠️ «포기»가 아니라 «안내»다 — 이게 떠 있는
 *             동안에도 App 은 폴링을 계속하고, 결과가 오면 그대로 넘어간다.
 * error       진짜 실패했을 때만 넣는다. 이때만 [다시 시도]가 뜬다.
 */
type LoadingOneScreenProps = {
  phase: number
  isComplete: boolean
  onComplete: () => void
  notice?: string | null
  error?: string | null
  /** 실패는 아니지만 너무 오래 걸릴 때 — 안내와 함께 [다시 시도]를 같이 보인다. */
  canRetry?: boolean
  onRetry?: () => void
}

export function LoadingOneScreen({ phase, isComplete, onComplete, notice, error, canRetry, onRetry }: LoadingOneScreenProps) {
  const progress = useLoadingProgress(phase, loadingSteps.length, isComplete)
  // 막대는 점근하느라 단계 끝에 딱 안 닿는다. 그래서 강조 단계는 막대가 아니라
  // phase 를 그대로 쓴다 — 안 그러면 3단계인데 2번 항목에 불이 들어와 있다.
  const activeStep = Math.min(loadingSteps.length - 1, phase)
  const guideOffset = activeStep * 43
  const hasFinished = useRef(false)

  useEffect(() => {
    // ⚠️ 실패 상태면 넘기지 않는다 — 빈 결과 화면을 보여주느니 이 화면에 머무는 게 낫다.
    if (error || progress !== 100 || hasFinished.current) return
    hasFinished.current = true
    const transitionTimer = window.setTimeout(onComplete, 650)
    return () => window.clearTimeout(transitionTimer)
  }, [error, onComplete, progress])

  return <FixedStepFrame label="로딩1"><div className="loading-two-page">
    <div className="loading-two-figure"><img className="loading-two-shadow" src={loadingTwoShadow} alt="" /><img className={`loading-two-runner ${progress === 100 ? 'is-finished' : ''}`} src={loadingTwoRunner} alt="" /></div>
    <h1><em>결과지를</em> 분석 중이에요</h1>
    {error
      ? <p className="loading-two-message loading-two-message--error" role="alert">{error}{onRetry && <button type="button" onClick={onRetry}>다시 시도</button>}</p>
      : <p className="loading-two-message" aria-live="polite">{notice ?? '잠시만 기다려주세요!'}
          {canRetry && onRetry && <button className="loading-two-retry" type="button" onClick={onRetry}>다시 시도</button>}
        </p>}
    <section className="loading-two-progress" aria-label={`결과지 분석 진행률 ${progress}%`} style={{ '--loading-two-progress': `${progress}%` } as CSSProperties}><img className="loading-two-progress__track" src={loadingTwoProgressTrack} alt="" /><span className="loading-two-progress__fill"><img src={loadingTwoProgressFill} alt="" /></span><img className="loading-two-progress__runner" src={loadingTwoRunnerIcon} alt="" /><strong>{progress}%</strong></section>
    <img className="loading-two-glow" style={{ transform: `translateY(${guideOffset}px)` }} src={loadingTwoActiveGlow} alt="" />
    <ol className="loading-two-steps">{loadingSteps.map((step, index) => <li className={index === activeStep ? 'is-active' : ''} key={step}>
      {index > 0 && <img className="loading-two-connector" src={loadingTwoConnector} alt="" />}
      <span className="loading-two-step-icon">{index === activeStep ? <><img src={loadingTwoActiveRing} alt="" /><img src={loadingTwoStepCheck} alt="" /></> : <img src={loadingTwoIdleStep} alt="" />}</span><p>{step}</p>
    </li>)}</ol>
  </div></FixedStepFrame>
}
