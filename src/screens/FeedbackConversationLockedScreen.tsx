import coach from '../assets/feedback-lock-coach.png'
import glow from '../assets/feedback-lock-glow.svg'
import info from '../assets/feedback-lock-info.svg'
import lock from '../assets/feedback-lock-icon.svg'
import { FixedStepFrame } from '../components/FixedStepFrame'

import type { CoachFinalized } from '../lib/api'

/** Figma 782:1221 — 피드백-대화잠금. 변경 요약은 코치 대화 finalized 실데이터. */
export function FeedbackConversationLockedScreen({ finalized }: { finalized: CoachFinalized | null }) {
  return <FixedStepFrame label="피드백 대화 잠금"><main className="feedback-locked-page">
    <img className="feedback-locked-page__glow" src={glow} alt="" />
    <img className="feedback-locked-page__coach" src={coach} alt="피드백을 정리하는 운동 코치" />
    <h1>{finalized ? '좋아요! 정리해드릴게요.' : '오늘 운동 완료!'}</h1>
    <p className="feedback-locked-page__notice">{finalized?.summary ?? '통증이 계속되면 운동을 중단하고 전문가와 상담하세요.'}</p>
    <section className="feedback-locked-page__changes" aria-label="루틴 변경 사항">
      {(finalized?.changes ?? []).map((change, index) => <article key={index}><strong>{change.what}</strong><span>{change.why}</span></article>)}
      {(!finalized || finalized.changes.length === 0) && <article><strong>변경 사항 없음</strong><span>다음 운동도 지금 루틴 그대로 진행돼요.</span></article>}
    </section>
    {/* 대화 잠금 화면 — 선택은 이미 끝났으므로 버튼을 비활성화해 잠금 상태를 명확히 한다 */}
    <div className="feedback-locked-page__choices" aria-label="피드백 반영 선택 (완료됨)"><button className="is-selected" type="button" disabled>이대로 적용할게요</button><button type="button" disabled>그대로 둘게요</button></div>
    <div className="feedback-locked-page__overlay" aria-hidden="true" />
    <p className="feedback-locked-page__message">
      <span className="feedback-locked-page__info-icon" aria-hidden="true"><img src={info} alt="" /></span>
      대화가 완료되었습니다. 선택 후 다음 운동부터 반영돼요.
    </p>
    <img className="feedback-locked-page__lock" src={lock} alt="대화가 잠겼습니다" />
  </main></FixedStepFrame>
}
