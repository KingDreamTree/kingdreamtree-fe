import reflectionCoach from '../assets/feedback-reflection-coach.png'
import reflectionGlow from '../assets/feedback-reflection-glow.svg'
import { FixedStepFrame } from '../components/FixedStepFrame'
import type { CoachFinalized } from '../lib/api'

type FeedbackReflectionScreenProps = { finalized: CoachFinalized | null; onApply: () => void; onKeep: () => void }

/** Figma 657:4711 — 피드백-반영여부. 변경 요약은 코치 대화 finalized 실데이터. */
export function FeedbackReflectionScreen({ finalized, onApply, onKeep }: FeedbackReflectionScreenProps) {
  return <FixedStepFrame label="피드백 반영 여부"><div className="feedback-reflection-page">
    <img className="feedback-reflection-page__glow" src={reflectionGlow} alt="" />
    <img className="feedback-reflection-page__coach" src={reflectionCoach} alt="피드백을 정리하는 운동 코치" />
    <h1>좋아요! 정리해드릴게요.</h1>
    <p className="feedback-reflection-page__notice">{finalized?.summary ?? '통증이 계속되면 운동을 중단하고 전문가와 상담하세요.'}</p>
    <section className="feedback-reflection-page__changes" aria-label="루틴 변경 사항">
      {(finalized?.changes ?? []).map((change, index) => <article key={index}><strong>{change.what}</strong><span>{change.why}</span></article>)}
      {(!finalized || finalized.changes.length === 0) && <article><strong>변경 사항 없음</strong><span>지금 루틴을 그대로 유지해도 좋아요.</span></article>}
    </section>
    <div className="feedback-reflection-page__choices" aria-label="피드백 반영 선택">
      <button className="is-selected" type="button" onClick={onApply}>이대로 적용할게요</button>
      <button type="button" onClick={onKeep}>그대로 둘게요</button>
    </div>
  </div></FixedStepFrame>
}
