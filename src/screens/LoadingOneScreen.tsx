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
 */
type LoadingOneScreenProps = { phase: number; isComplete: boolean; onComplete: () => void }

export function LoadingOneScreen({ phase, isComplete, onComplete }: LoadingOneScreenProps) {
  const progress = useLoadingProgress(phase, loadingSteps.length, isComplete)
  // 막대는 점근하느라 단계 끝에 딱 안 닿는다. 그래서 강조 단계는 막대가 아니라
  // phase 를 그대로 쓴다 — 안 그러면 3단계인데 2번 항목에 불이 들어와 있다.
  const activeStep = Math.min(loadingSteps.length - 1, phase)
  const guideOffset = activeStep * 43
  const hasFinished = useRef(false)

  useEffect(() => {
    if (progress !== 100 || hasFinished.current) return
    hasFinished.current = true
    const transitionTimer = window.setTimeout(onComplete, 250)
    return () => window.clearTimeout(transitionTimer)
  }, [onComplete, progress])

  return <FixedStepFrame label="로딩1"><div className="loading-two-page">
    <div className="loading-two-figure"><img className="loading-two-shadow" src={loadingTwoShadow} alt="" /><img className={`loading-two-runner ${progress === 100 ? 'is-finished' : ''}`} src={loadingTwoRunner} alt="" /></div>
    <h1><em>결과지를</em> 분석 중이에요</h1><p className="loading-two-message">잠시만 기다려주세요!</p>
    <section className="loading-two-progress" aria-label={`결과지 분석 진행률 ${progress}%`} style={{ '--loading-two-progress': `${progress}%` } as CSSProperties}><img className="loading-two-progress__track" src={loadingTwoProgressTrack} alt="" /><span className="loading-two-progress__fill"><img src={loadingTwoProgressFill} alt="" /></span><img className="loading-two-progress__runner" src={loadingTwoRunnerIcon} alt="" /><strong>{progress}%</strong></section>
    <img className="loading-two-glow" style={{ transform: `translateY(${guideOffset}px)` }} src={loadingTwoActiveGlow} alt="" />
    <ol className="loading-two-steps">{loadingSteps.map((step, index) => <li className={index === activeStep ? 'is-active' : ''} key={step}>
      {index > 0 && <img className="loading-two-connector" src={loadingTwoConnector} alt="" />}
      <span className="loading-two-step-icon">{index === activeStep ? <><img src={loadingTwoActiveRing} alt="" /><img src={loadingTwoStepCheck} alt="" /></> : <img src={loadingTwoIdleStep} alt="" />}</span><p>{step}</p>
    </li>)}</ol>
  </div></FixedStepFrame>
}