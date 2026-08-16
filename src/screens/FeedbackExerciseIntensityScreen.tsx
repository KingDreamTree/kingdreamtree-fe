import { useState } from 'react'
import feedbackCheck from '../assets/feedback-attention-check.svg'
import feedbackIllustration from '../assets/feedback-loading-message.png'
import inactiveSendIcon from '../assets/feedback-circle.svg'
import sendIcon from '../assets/feedback-loading-input-icon.svg'
import { FixedStepFrame } from '../components/FixedStepFrame'

type FeedbackExerciseIntensityScreenProps = { feedback: string; onNext: () => void }

/** Figma 782:1134 — 피드백 - 운동, 강도 */
export function FeedbackExerciseIntensityScreen({ feedback, onNext }: FeedbackExerciseIntensityScreenProps) {
  const message = feedback || '응 그렇게 바꿔줘'
  const [nextFeedback, setNextFeedback] = useState('')
  const isReadyToSubmit = Boolean(nextFeedback.trim())

  return <FixedStepFrame label="피드백 운동 강도"><div className="feedback-exercise-page">
    <header className="feedback-exercise-page__header"><span>DAY 1 운동 완료</span><button type="button" onClick={onNext} aria-label="피드백 반영 여부 보기">→</button></header>
    <img className="feedback-exercise-page__coach" src={feedbackIllustration} alt="운동과 강도를 조절하는 코치" />
    <p className="feedback-exercise-page__message">{message}</p>
    <section className="feedback-exercise-page__reply" aria-label="운동 조절 결과">
      <p>좋아요! 다음 루틴부터 운동을 교체하고 강도도 조절해서<br />더 안전하게 진행할 수 있도록 할게요.</p>
      <div><span><img src={feedbackCheck} alt="" /></span><strong>운동 교체</strong></div>
      <div><span><img src={feedbackCheck} alt="" /></span><strong>강도 조절</strong></div>
    </section>
    <form className="feedback-exercise-page__input" onSubmit={event => { event.preventDefault(); if (isReadyToSubmit) onNext() }}><label className="sr-only" htmlFor="exercise-feedback-message">새 피드백</label><input id="exercise-feedback-message" value={nextFeedback} onChange={event => setNextFeedback(event.target.value)} placeholder="새로운 피드백을 입력해 주세요." /><button type="submit" disabled={!isReadyToSubmit} aria-label="피드백 보내기"><img src={isReadyToSubmit ? sendIcon : inactiveSendIcon} alt="" /></button></form>
  </div></FixedStepFrame>
}
