import coach from '../assets/feedback-applied-coach.png'
import glow from '../assets/feedback-applied-glow.svg'
import { FixedStepFrame } from '../components/FixedStepFrame'

/** Figma 657:5039 — 피드백반영버전 */
export function FeedbackAppliedScreen() {
  return <FixedStepFrame label="피드백 반영 버전"><main className="feedback-result-page feedback-result-page--applied">
    <img className="feedback-result-page__glow" src={glow} alt="" />
    <img className="feedback-result-page__coach" src={coach} alt="새 루틴을 안내하는 운동 코치" />
    <h1>다음 운동부터<br />새 루틴으로 진행돼요!</h1>
    <button type="button">바뀐 루틴 보기</button>
  </main></FixedStepFrame>
}
