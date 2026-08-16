import { useEffect, useState, type CSSProperties } from 'react'
import loadingTwoRunner from '../assets/loading2-runner.png'
import loadingShadow from '../assets/loading1-shadow.svg'
import loadingProgressRunner from '../assets/loading1-progress-runner.svg'
import loadingStepActive from '../assets/loading1-step-active.svg'
import loadingStepIdle from '../assets/loading1-step-idle.svg'
import loadingTwoActiveGlow from '../assets/loading2-active-step.svg'
import { FixedStepFrame } from '../components/FixedStepFrame'

const steps = ['체형 데이터를 불러오는 중...', '레퍼런스와 비교 분석 중...', 'AI가 체형 분석 중..', '맞춤 운동 루틴 생성 중..']
const loadingDuration = 3500

export function LoadingOneScreen({ onComplete }: { onComplete: () => void }) {
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

  return <FixedStepFrame label="로딩1"><div className="loading-one-page">
    <div className="loading-one-figure"><img className="loading-one-shadow" src={loadingShadow} alt="" /><img className={`loading-one-runner ${progress === 100 ? 'is-finished' : ''}`} src={loadingTwoRunner} alt="" /></div>
    <h1><em>결과지를</em> 분석 중이에요</h1><p className="loading-one-message">잠시만 기다려주세요!</p>
    <div className="loading-one-progress" aria-label={`분석 진행률 ${progress}%`} style={{ '--loading-progress': `${progress}%` } as CSSProperties}><span /><img className={progress === 100 ? 'is-finished' : ''} src={loadingProgressRunner} alt="" /><strong>{progress}%</strong></div>
    <img className="loading-one-glow" style={{ transform: `translateY(${guideOffset}px)` }} src={loadingTwoActiveGlow} alt="" />
    <ol className="loading-one-steps">{steps.map((step, index) => <li className={index === activeStep ? 'is-active' : ''} key={step}><img src={index === activeStep ? loadingStepActive : loadingStepIdle} alt="" /><span>{step}</span></li>)}</ol>
  </div></FixedStepFrame>
}
