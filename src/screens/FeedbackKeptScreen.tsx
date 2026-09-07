import coach from '../assets/feedback-kept-coach.png'
import glow from '../assets/feedback-kept-glow.svg'
import { FixedStepFrame } from '../components/FixedStepFrame'

/** Figma 657:5061 — 피드백반영X */
export function FeedbackKeptScreen() {
  return <FixedStepFrame label="피드백 반영 안 함"><main className="feedback-result-page feedback-result-page--kept">
    <img className="feedback-result-page__glow" src={glow} alt="" />
    <img className="feedback-result-page__coach" src={coach} alt="운동 코치" />
    <h1>오늘 대화는 기록해뒀어요.<br />루틴은 그대로에요!</h1>
  </main></FixedStepFrame>
}
