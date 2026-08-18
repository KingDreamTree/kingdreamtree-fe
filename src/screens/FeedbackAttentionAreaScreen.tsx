import { useEffect, useState } from 'react'
import feedbackCheck from '../assets/feedback-attention-check.svg'
import feedbackIllustration from '../assets/feedback-loading-message.png'
import inactiveSendIcon from '../assets/feedback-circle.svg'
import sendIcon from '../assets/feedback-loading-input-icon.svg'
import { FixedStepFrame } from '../components/FixedStepFrame'
import type { CoachChatResponse } from '../lib/api'
import { useEnterToSubmit } from '../lib/ime'

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
  // ⚠️ 응답을 기다리는 동안에도 화면을 안 바꾼다(2026-08-18) — 예전엔 보내는 순간
  //    feedback-loading 화면으로 넘어갔다가 응답이 오면 이 화면으로 돌아왔는데,
  //    그 왕복이 매 턴 이 컴포넌트를 마운트 해제·재마운트시켜 "말풍선이 커졌다
  //    줄어드는" 플래시의 진짜 원인이었다(FixedStepFrame이 다시 배율을 잰다).
  //    방금 보낸 내 메시지를 여기서 낙관적으로 먼저 그리고, 응답이 오면(coach가
  //    바뀌면) 지운다 — 그 시점엔 coach.messages 에 이미 들어있으므로 안 겹친다.
  const [pendingText, setPendingText] = useState<string | null>(null)
  const isReadyToSubmit = Boolean(nextFeedback.trim())
  const baseMessages = coach?.messages?.length
    ? coach.messages
    : [{ role: 'user', content: userMessage }, { role: 'assistant', content: coach?.reply ?? '코치가 피드백을 확인하고 있어요.' }]

  useEffect(() => { setPendingText(null) }, [coach])

  const messages = pendingText ? [...baseMessages, { role: 'user', content: pendingText }] : baseMessages

  const submitFeedback = () => {
    if (!isReadyToSubmit) return
    setPendingText(nextFeedback.trim())
    onSubmit(nextFeedback.trim())
    setNextFeedback('')
  }
  const enterToSubmit = useEnterToSubmit(submitFeedback)

  return <FixedStepFrame label="피드백 대화" fitContent><div className="feedback-attention-page">
    <header className="feedback-attention-page__header"><span>운동 완료{coach ? ` · 대화 ${coach.turn}/${coach.max_turns}` : ''}</span><button type="button" onClick={onExit}>나가기 →</button></header>
    {/* ⚠️ 대화 이력·입력창은 흐름(flow)에 둔다 — 예전엔 페이지가 height:1024 고정
        + 이력만 안에서 스크롤이라, 몇 턴만 쌓여도 좁은 상자 안에 눌려 있었다.
        FixedStepFrame(fitContent)이 내용만큼 액자를 늘려주므로, 여기서는 그냥
        흐르게만 두면 대화가 늘어난 만큼 화면 자체가 늘어난다. */}
    <div className="feedback-attention-page__body">
      <section className="feedback-chat-history" aria-label="피드백 대화">
        {messages.map((message, index) => <div className={`feedback-chat-history__row ${message.role === 'user' ? 'is-user' : 'is-assistant'}`} key={`${message.role}-${index}`}>
          {message.role === 'assistant' && <img className="feedback-chat-history__avatar" src={feedbackIllustration} alt="" />}
          <p className={`feedback-chat-history__message ${message.role === 'user' ? 'is-user' : 'is-assistant'}`}>{message.content}</p>
        </div>)}
        {pendingText && <div className="feedback-chat-history__row is-assistant">
          <img className="feedback-chat-history__avatar" src={feedbackIllustration} alt="" />
          <p className="feedback-chat-history__message is-assistant is-typing">코치가 답장을 작성하고 있어요…</p>
        </div>}
        {coach?.tool_events?.map((event, index) => <div className="feedback-chat-history__tool-event" key={`${event.name}-${index}`}><span><img src={feedbackCheck} alt="" /></span><strong>{toolEventLabel(event)}</strong></div>)}
      </section>
      <form className="feedback-attention-page__input" onSubmit={event => { event.preventDefault(); submitFeedback() }}><label className="sr-only" htmlFor="attention-feedback-message">새 피드백</label><input id="attention-feedback-message" value={nextFeedback} onChange={event => setNextFeedback(event.target.value)} {...enterToSubmit} placeholder="코치에게 답해 주세요." /><button type="submit" disabled={!isReadyToSubmit} aria-label="피드백 보내기"><img src={isReadyToSubmit ? sendIcon : inactiveSendIcon} alt="" /></button></form>
    </div>
  </div></FixedStepFrame>
}
