import { useEffect } from 'react'
import feedbackIllustration from '../assets/feedback-loading-message.png'
import sendIcon from '../assets/feedback-loading-input-icon.svg'
import typingBubble from '../assets/feedback-loading-typing.svg'
import { FixedStepFrame } from '../components/FixedStepFrame'

type FeedbackLoadingScreenProps = { feedback: string; onComplete: () => void }

/** Figma 657:4915 — 오늘 루틴 - 피드백 로딩 */
export function FeedbackLoadingScreen({ feedback, onComplete }: FeedbackLoadingScreenProps) {
  const message = feedback || '오늘 어깨 운동에서 벤치 프레스 횟수가 부담스러워요.'

  useEffect(() => {
    const timer = window.setTimeout(onComplete, 2000)
    return () => window.clearTimeout(timer)
  }, [onComplete])

  return <FixedStepFrame label="오늘 루틴 피드백 로딩"><div className="feedback-loading-page">
    <header className="feedback-loading-page__header"><span>DAY 1 운동 완료</span><button type="button" aria-label="다음"><span>→</span></button></header>
    <img className="feedback-loading-page__coach" src={feedbackIllustration} alt="피드백을 확인하는 운동 코치" />
    <img className="feedback-loading-page__typing" src={typingBubble} alt="피드백을 분석 중" />
    <p className="feedback-loading-page__message">{message}</p>
    <div className="feedback-loading-page__input" aria-label="보낸 피드백"><span>{message}</span><img src={sendIcon} alt="" /></div>
  </div></FixedStepFrame>
}
