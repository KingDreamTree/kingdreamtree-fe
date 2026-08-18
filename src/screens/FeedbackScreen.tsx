import { useState } from 'react'
import feedbackIllustration from '../assets/feedback-decoration.png'
import feedbackCircle from '../assets/feedback-input-clear.svg'
import feedbackInactiveSendIcon from '../assets/feedback-circle.svg'
import feedbackActiveSendIcon from '../assets/feedback-loading-input-icon.svg'
import { FixedStepFrame } from '../components/FixedStepFrame'
import { useEnterToSubmit } from '../lib/ime'

/** Figma 657:4507 — 피드백 */
export function FeedbackScreen({ onSubmit, onSkip }: { onSubmit: (feedback: string) => void; onSkip: () => void }) {
  const [feedback, setFeedback] = useState('')
  const isReadyToSubmit = Boolean(feedback.trim())

  const submitFeedback = () => {
    if (isReadyToSubmit) onSubmit(feedback.trim())
  }
  const enterToSubmit = useEnterToSubmit(submitFeedback)

  return <FixedStepFrame label="피드백"><div className="feedback-page">
    <p className="feedback-page__eyebrow">오늘 운동 어떠셨나요?</p>
    <h1>오늘 운동에 대한 피드백을 적어주세요</h1>
    <p className="feedback-page__description">피드백을 통해 주의 부위 등록, 운동 교체, 강도 조정 등<br />나에게 맞는 운동 루틴으로 바꿀 수 있어요!</p>
    <img className="feedback-page__circle" src={feedbackCircle} alt="" />
    <img className="feedback-page__illustration" src={feedbackIllustration} alt="운동 코치 일러스트" />
    <form className="feedback-page__input" autoComplete="off" onSubmit={event => { event.preventDefault(); submitFeedback() }}><label className="sr-only" htmlFor="feedback-message">오늘 운동 피드백</label><input id="feedback-message" autoComplete="off" value={feedback} onChange={event => setFeedback(event.target.value)} {...enterToSubmit} placeholder="ex) 오늘 어깨 운동에서 벤치 프레스 횟수가 부담스러워요." /><button type="submit" disabled={!isReadyToSubmit} aria-label="피드백 보내기"><img src={isReadyToSubmit ? feedbackActiveSendIcon : feedbackInactiveSendIcon} alt="" /></button></form>
    <button className="feedback-page__skip" type="button" onClick={onSkip}>오늘은 패스할래요 →</button>
  </div></FixedStepFrame>
}
