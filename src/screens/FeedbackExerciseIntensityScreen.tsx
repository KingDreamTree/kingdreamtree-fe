import { useState } from 'react'
import feedbackCheck from '../assets/feedback-attention-check.svg'
import feedbackIllustration from '../assets/feedback-loading-message.png'
import inactiveSendIcon from '../assets/feedback-circle.svg'
import sendIcon from '../assets/feedback-loading-input-icon.svg'
import { FixedStepFrame } from '../components/FixedStepFrame'
import type { CoachChatResponse } from '../lib/api'

type FeedbackExerciseIntensityScreenProps = {
  userMessage: string
  coach: CoachChatResponse | null
  onSubmit: (feedback: string) => void
  onNext: () => void
}

function toolEventLabel(event: { name: string; args: Record<string, unknown> }): string {
  if (event.name === 'flag_contraindication') {
    const area = typeof event.args.area === 'string' ? event.args.area : typeof event.args.body_part === 'string' ? event.args.body_part : null
    return area ? `${area} → 주의 부위 등록` : '주의 부위 등록'
  }
  if (event.name === 'swap_exercise') return '운동 교체'
  if (event.name === 'adjust_intensity') return '강도 조절'
  return event.name
}

/** Figma 782:1134 — 피드백 - 운동, 강도. 2턴째부터의 코치 응답을 이 레이아웃으로 보여준다. */
export function FeedbackExerciseIntensityScreen({ userMessage, coach, onSubmit, onNext }: FeedbackExerciseIntensityScreenProps) {
  const [nextFeedback, setNextFeedback] = useState('')
  const isReadyToSubmit = Boolean(nextFeedback.trim())
  const messages = coach?.messages?.length
    ? coach.messages
    : [{ role: 'user', content: userMessage }, { role: 'assistant', content: coach?.reply ?? '코치가 피드백을 확인하고 있어요.' }]

  const submitFeedback = () => {
    if (!isReadyToSubmit) return
    onSubmit(nextFeedback.trim())
    setNextFeedback('')
  }

  return <FixedStepFrame label="피드백 운동 강도"><div className="feedback-exercise-page">
    <header className="feedback-exercise-page__header"><span>운동 완료{coach ? ` · 대화 ${coach.turn}/${coach.max_turns}` : ''}</span><button type="button" onClick={onNext} aria-label="피드백 반영 여부 보기">→</button></header>
    <img className="feedback-exercise-page__coach" src={feedbackIllustration} alt="운동과 강도를 조절하는 코치" />
    <section className="feedback-chat-history" aria-label="피드백 대화">
      {messages.map((message, index) => <p className={`feedback-chat-history__message ${message.role === 'user' ? 'is-user' : 'is-assistant'}`} key={`${message.role}-${index}`}>{message.content}</p>)}
    </section>
    <section className="feedback-exercise-page__reply" aria-label="운동 조절 결과">
      <p>{coach?.reply ?? '코치가 피드백을 확인하고 있어요…'}</p>
      {coach?.tool_events?.map((event, index) => <div key={`${event.name}-${index}`}><span><img src={feedbackCheck} alt="" /></span><strong>{toolEventLabel(event)}</strong></div>)}
    </section>
    <form className="feedback-exercise-page__input" onSubmit={event => { event.preventDefault(); submitFeedback() }}><label className="sr-only" htmlFor="exercise-feedback-message">새 피드백</label><input id="exercise-feedback-message" value={nextFeedback} onChange={event => setNextFeedback(event.target.value)} placeholder="새로운 피드백을 입력해 주세요." /><button type="submit" disabled={!isReadyToSubmit} aria-label="피드백 보내기"><img src={isReadyToSubmit ? sendIcon : inactiveSendIcon} alt="" /></button></form>
  </div></FixedStepFrame>
}
