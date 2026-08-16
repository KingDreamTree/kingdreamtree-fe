import { useState } from 'react'
import feedbackCheck from '../assets/feedback-attention-check.svg'
import feedbackIllustration from '../assets/feedback-loading-message.png'
import inactiveSendIcon from '../assets/feedback-circle.svg'
import sendIcon from '../assets/feedback-loading-input-icon.svg'
import { FixedStepFrame } from '../components/FixedStepFrame'

type FeedbackAttentionAreaScreenProps = { feedback: string; onSubmit: (feedback: string) => void }

/** Figma 778:1065 — 피드백-주의부위 */
export function FeedbackAttentionAreaScreen({ feedback, onSubmit }: FeedbackAttentionAreaScreenProps) {
  const message = feedback || '오늘 어깨 운동에서 벤치 프레스 횟수가 부담스러워요.'
  const [nextFeedback, setNextFeedback] = useState('')
  const isReadyToSubmit = Boolean(nextFeedback.trim())

  const submitFeedback = () => {
    if (isReadyToSubmit) onSubmit(nextFeedback.trim())
  }

  return <FixedStepFrame label="피드백 주의부위"><div className="feedback-attention-page">
    <header className="feedback-attention-page__header"><span>DAY 1 운동 완료</span><span aria-hidden="true">→</span></header>
    <img className="feedback-attention-page__coach" src={feedbackIllustration} alt="피드백을 확인한 운동 코치" />
    <p className="feedback-attention-page__message">{message}</p>
    <section className="feedback-attention-page__reply" aria-label="피드백 분석 결과">
      <p>알려주셔서 다행이에요.<br />다음부터 부담이 적은 운동으로 바꿔볼게요.</p>
      <div><span><img src={feedbackCheck} alt="" /></span><strong>무릎 → 주의 부위 등록</strong></div>
    </section>
    <form className="feedback-attention-page__input" onSubmit={event => { event.preventDefault(); submitFeedback() }}><label className="sr-only" htmlFor="attention-feedback-message">새 피드백</label><input id="attention-feedback-message" value={nextFeedback} onChange={event => setNextFeedback(event.target.value)} placeholder="새로운 피드백을 입력해 주세요." /><button type="submit" disabled={!isReadyToSubmit} aria-label="피드백 보내기"><img src={isReadyToSubmit ? sendIcon : inactiveSendIcon} alt="" /></button></form>
  </div></FixedStepFrame>
}
