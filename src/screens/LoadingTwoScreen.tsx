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

const loadingSteps = ['비교 결과 데이터 불러오는 중...', '가능한 운동 일수 분석 중...', '오늘의 루틴 생성 중...', '4주간 핵심 목표 생성 중...']
const loadingDuration = 3500

/** Figma 763:699 — 로딩2 */
export function LoadingTwoScreen({ onComplete }: { onComplete: () => void }) {
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
    if (progress !== 100) return
    const transitionTimer = window.setTimeout(onComplete, 650)
    return () => window.clearTimeout(transitionTimer)
  }, [onComplete, progress])

  return <FixedStepFrame label="로딩2"><div className="loading-two-page">
    <div className="loading-two-figure"><img className="loading-two-shadow" src={loadingTwoShadow} alt="" /><img className={`loading-two-runner ${progress === 100 ? 'is-finished' : ''}`} src={loadingTwoRunner} alt="" /></div>
    <h1><em>맞춤 루틴을</em> 생성 중이에요</h1><p className="loading-two-message">잠시만 기다려주세요!</p>
    <section className="loading-two-progress" aria-label={`맞춤 루틴 생성 진행률 ${progress}%`} style={{ '--loading-two-progress': `${progress}%` } as CSSProperties}><img className="loading-two-progress__track" src={loadingTwoProgressTrack} alt="" /><span className="loading-two-progress__fill"><img src={loadingTwoProgressFill} alt="" /></span><img className="loading-two-progress__runner" src={loadingTwoRunnerIcon} alt="" /><strong>{progress}%</strong></section>
    <img className="loading-two-glow" style={{ transform: `translateY(${guideOffset}px)` }} src={loadingTwoActiveGlow} alt="" />
    <ol className="loading-two-steps">{loadingSteps.map((step, index) => <li className={index === activeStep ? 'is-active' : ''} key={step}>
      {index > 0 && <img className="loading-two-connector" src={loadingTwoConnector} alt="" />}
      <span className="loading-two-step-icon">{index === activeStep ? <><img src={loadingTwoActiveRing} alt="" /><img src={loadingTwoStepCheck} alt="" /></> : <img src={loadingTwoIdleStep} alt="" />}</span><p>{step}</p>
    </li>)}</ol>
  </div></FixedStepFrame>
}
