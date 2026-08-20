import { useEffect, useRef, useState } from 'react'
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
/** 대화 거품에 그릴 글. 도구 호출 JSON 이 그대로 답으로 나오는 경우가 있어서
 *  («세션이 꼬였다» 던 그때 화면에 «{ … }» 만 떴다) 원문 JSON 은 그리지 않는다.
 *  ⚠️ 사용자에게 보여줄 말이 아니다 — 감추고 넘어가는 편이 낫다. */
function chatText(content: string | null | undefined): string | null {
  const text = (content ?? '').trim()
  if (!text) return null
  const looksLikeJson = (text.startsWith('{') && text.endsWith('}')) || (text.startsWith('[') && text.endsWith(']'))
  return looksLikeJson ? null : text
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
  const historyRef = useRef<HTMLElement>(null)
  const isReadyToSubmit = Boolean(nextFeedback.trim())
  // ⚠️ 첫 턴에는 코치 자리에 «확인하고 있어요» 같은 **글을 넣지 않는다.** 그 글이
  //    말풍선으로 한 번 떴다가 진짜 답으로 바뀌면 대화가 끊겨 보인다 — 기다리는
  //    동안에는 아래 «말하는 중» 점 세 개만 둔다(둘째 턴부터와 같은 모습).
  const baseMessages = coach?.messages?.length
    ? coach.messages
    : [{ role: 'user', content: userMessage }]

  useEffect(() => { setPendingText(null) }, [coach])

  const messages = pendingText ? [...baseMessages, { role: 'user', content: pendingText }] : baseMessages

  // 카톡처럼 입력창은 하단에 고정, 이력만 안에서 스크롤 — 새 메시지가 오면 맨 아래로.
  useEffect(() => {
    const history = historyRef.current
    if (history) history.scrollTo({ top: history.scrollHeight, behavior: 'smooth' })
  }, [messages.length, pendingText])

  const submitFeedback = () => {
    if (!isReadyToSubmit) return
    setPendingText(nextFeedback.trim())
    onSubmit(nextFeedback.trim())
    setNextFeedback('')
  }
  const enterToSubmit = useEnterToSubmit(submitFeedback)

  return <FixedStepFrame label="피드백 대화"><div className="feedback-attention-page">
    <header className="feedback-attention-page__header"><span>운동 완료{coach ? ` · 대화 ${coach.turn}/${coach.max_turns}` : ''}</span><button type="button" onClick={onExit}>나가기 →</button></header>
    <section ref={historyRef} className="feedback-chat-history" aria-label="피드백 대화">
      {messages.map((message, index) => chatText(message.content) && <div className={`feedback-chat-history__row ${message.role === 'user' ? 'is-user' : 'is-assistant'}`} key={`${message.role}-${index}`}>
        {message.role === 'assistant' && <img className="feedback-chat-history__avatar" src={feedbackIllustration} alt="" />}
        <p className={`feedback-chat-history__message ${message.role === 'user' ? 'is-user' : 'is-assistant'}`}>{chatText(message.content)}</p>
      </div>)}
      {/* 답을 기다리는 모든 순간 — 첫 턴(coach 가 아직 없음)과 이어지는 턴(방금 보냄) */}
      {(pendingText || !coach) && <div className="feedback-chat-history__row is-assistant">
        <img className="feedback-chat-history__avatar" src={feedbackIllustration} alt="" />
        {/* 말하고 있다는 표시 — 점 세 개. 글로 쓰면 «지연 안내»처럼 읽혀서 점으로만 둔다. */}
        <p className="feedback-chat-history__message is-assistant is-typing" role="status" aria-label="코치가 답장을 작성하고 있어요">
          <span>•</span><span>•</span><span>•</span>
        </p>
      </div>}
      {coach?.tool_events?.map((event, index) => <div className="feedback-chat-history__tool-event" key={`${event.name}-${index}`}><span><img src={feedbackCheck} alt="" /></span><strong>{toolEventLabel(event)}</strong></div>)}
    </section>
    <form className="feedback-attention-page__input" onSubmit={event => { event.preventDefault(); submitFeedback() }}><label className="sr-only" htmlFor="attention-feedback-message">새 피드백</label><input id="attention-feedback-message" value={nextFeedback} onChange={event => setNextFeedback(event.target.value)} {...enterToSubmit} placeholder="코치에게 답해 주세요." /><button type="submit" disabled={!isReadyToSubmit} aria-label="피드백 보내기"><img src={isReadyToSubmit ? sendIcon : inactiveSendIcon} alt="" /></button></form>
  </div></FixedStepFrame>
}
