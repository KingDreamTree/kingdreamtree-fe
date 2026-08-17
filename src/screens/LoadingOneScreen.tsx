import { useEffect, useState, type CSSProperties } from 'react'
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

const loadingSteps = ['체형 데이터를 불러오는 중...', '레퍼런스와 비교 분석 중...', 'AI가 체형을 분석 중...', '분석 결과를 정리하는 중...']
const loadingDuration = 3500

type LoadingOneScreenProps = { isAnalysisReady: boolean; onComplete: () => void }

export function LoadingOneScreen({ isAnalysisReady, onComplete }: LoadingOneScreenProps) {
  const [progress, setProgress] = useState(0)
  const activeStep = Math.min(3, Math.floor(progress / 25))
  const guideOffset = Math.min(3, progress / 25) * 43

  useEffect(() => {
    let animationFrame = 0
    let startedAt: number | undefined

    const advance = (timestamp: number) => {
      startedAt ??= timestamp
      const nextProgress = Math.min(100, Math.round(((timestamp - startedAt) / loadingDuration) * 100))
      setProgress(nextProgress)
      if (nextProgress < 100) animationFrame = window.requestAnimationFrame(advance)
    }

    animationFrame = window.requestAnimationFrame(advance)
    return () => window.cancelAnimationFrame(animationFrame)
  }, [])

  useEffect(() => {
    if (progress !== 100 || !isAnalysisReady) return
    const transitionTimer = window.setTimeout(onComplete, 650)
    return () => window.clearTimeout(transitionTimer)
  }, [isAnalysisReady, onComplete, progress])

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