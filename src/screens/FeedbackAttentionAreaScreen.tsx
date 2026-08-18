import { useEffect, useRef, useState } from 'react'
import feedbackCheck from '../assets/feedback-attention-check.svg'
import feedbackIllustration from '../assets/feedback-loading-message.png'
import inactiveSendIcon from '../assets/feedback-circle.svg'
import sendIcon from '../assets/feedback-loading-input-icon.svg'
import { FixedStepFrame } from '../components/FixedStepFrame'
import type { CoachChatResponse } from '../lib/api'

type FeedbackAttentionAreaScreenProps = {
  userMessage: string
  coach: CoachChatResponse | null
  onSubmit: (feedback: string) => void
  onExit: () => void
}

/** tool_events를 사용자 언어 배지로 — 금기 등록은 [적용]을 기다리지 않고 즉시 반영된다. */
function toolEventLabel(event: { name: string; args: Record<string, unknown> }): string {
  if (event.name === 'flag_contraindication') {
    const area = typeof event.args.area === 'string' ? event.args.area : typeof event.args.body_part === 'string' ? event.args.body_part : null
    return area ? `${area} → 주의 부위 등록` : '주의 부위 등록'
  }
  if (event.name === 'swap_exercise') return '운동 교체'
  if (event.name === 'adjust_intensity') return '강도 조절'
  return event.name
}

/** Figma 778:1065 — 피드백 대화 (코치 실응답). 대화가 이어지는 동안 이 화면을 반복 사용한다. */
export function FeedbackAttentionAreaScreen({ userMessage, coach, onSubmit, onExit }: FeedbackAttentionAreaScreenProps) {
  const [nextFeedback, setNextFeedback] = useState('')
  const historyRef = useRef<HTMLElement>(null)
  const isReadyToSubmit = Boolean(nextFeedback.trim())
  const messages = coach?.messages?.length
    ? coach.messages
    : [{ role: 'user', content: userMessage }, { role: 'assistant', content: coach?.reply ?? '코치가 피드백을 확인하고 있어요.' }]

  useEffect(() => {
    const history = historyRef.current
    if (history) history.scrollTo({ top: history.scrollHeight, behavior: 'smooth' })
  }, [messages.length])

  const submitFeedback = () => {
    if (!isReadyToSubmit) return
    onSubmit(nextFeedback.trim())
    setNextFeedback('')
  }

  return <FixedStepFrame label="피드백 대화"><div className="feedback-attention-page">
    <header className="feedback-attention-page__header"><span>운동 완료{coach ? ` · 대화 ${coach.turn}/${coach.max_turns}` : ''}</span><button type="button" onClick={onExit}>나가기 →</button></header>
    <img className="feedback-attention-page__coach" src={feedbackIllustration} alt="피드백을 확인한 운동 코치" />
    <section ref={historyRef} className="feedback-chat-history" aria-label="피드백 대화">
      {messages.map((message, index) => <p className={`feedback-chat-history__message ${message.role === 'user' ? 'is-user' : 'is-assistant'}`} key={`${message.role}-${index}`}>{message.content}</p>)}
    </section>
    <section className="feedback-attention-page__reply" aria-label="코치 답변">
      <p>{coach?.reply ?? '코치가 피드백을 확인하고 있어요…'}</p>
      {coach?.tool_events?.map((event, index) => <div key={`${event.name}-${index}`}><span><img src={feedbackCheck} alt="" /></span><strong>{toolEventLabel(event)}</strong></div>)}
    </section>
    <form className="feedback-attention-page__input" onSubmit={event => { event.preventDefault(); submitFeedback() }}><label className="sr-only" htmlFor="attention-feedback-message">새 피드백</label><input id="attention-feedback-message" value={nextFeedback} onChange={event => setNextFeedback(event.target.value)} placeholder="코치에게 답해 주세요." /><button type="submit" disabled={!isReadyToSubmit} aria-label="피드백 보내기"><img src={isReadyToSubmit ? sendIcon : inactiveSendIcon} alt="" /></button></form>
  </div></FixedStepFrame>
}
