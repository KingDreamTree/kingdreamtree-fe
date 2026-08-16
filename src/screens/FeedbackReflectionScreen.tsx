import reflectionCoach from '../assets/feedback-reflection-coach.png'
import reflectionGlow from '../assets/feedback-reflection-glow.svg'
import { FixedStepFrame } from '../components/FixedStepFrame'

/** Figma 657:4711 — 피드백-반영여부 */
export function FeedbackReflectionScreen({ onApply, onKeep }: { onApply: () => void; onKeep: () => void }) {
  return <FixedStepFrame label="피드백 반영 여부"><div className="feedback-reflection-page">
    <img className="feedback-reflection-page__glow" src={reflectionGlow} alt="" />
    <img className="feedback-reflection-page__coach" src={reflectionCoach} alt="피드백을 정리하는 운동 코치" />
    <h1>좋아요! 정리해드릴게요.</h1>
    <p className="feedback-reflection-page__notice">통증이 계속되면 운동을 중단하고 전문가와 상담하세요.</p>
    <section className="feedback-reflection-page__changes" aria-label="루틴 변경 사항">
      <article><strong>스쿼트 → 레그프레스</strong><span>무릎에 부담이 적은 운동으로 바꿨어요.</span></article>
      <article><strong>무릎 → 주의 부위 등록</strong><span>앞으로 모든 루틴에 반영되어요.</span></article>
    </section>
    <div className="feedback-reflection-page__choices" aria-label="피드백 반영 선택">
      <button className="is-selected" type="button" onClick={onApply}>이대로 적용할게요</button>
      <button type="button" onClick={onKeep}>그대로 둘게요</button>
    </div>
  </div></FixedStepFrame>
}
