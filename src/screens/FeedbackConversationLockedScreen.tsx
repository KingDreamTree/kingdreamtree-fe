import coach from '../assets/feedback-lock-coach.png'
import glow from '../assets/feedback-lock-glow.svg'
import info from '../assets/feedback-lock-info.svg'
import lock from '../assets/feedback-lock-icon.svg'
import { FixedStepFrame } from '../components/FixedStepFrame'

/** Figma 782:1221 — 피드백-대화잠금 */
export function FeedbackConversationLockedScreen() {
  return <FixedStepFrame label="피드백 대화 잠금"><main className="feedback-locked-page">
    <img className="feedback-locked-page__glow" src={glow} alt="" />
    <img className="feedback-locked-page__coach" src={coach} alt="피드백을 정리하는 운동 코치" />
    <h1>좋아요! 정리해드릴게요.</h1>
    <p className="feedback-locked-page__notice">통증이 계속되면 운동을 중단하고 전문가와 상담하세요.</p>
    <section className="feedback-locked-page__changes" aria-label="루틴 변경 사항">
      <article><strong>스쿼트 → 레그프레스</strong><span>무릎에 부담이 적은 운동으로 바꿨어요.</span></article>
      <article><strong>무릎 → 주의 부위 등록</strong><span>앞으로 모든 루틴에 반영되어요.</span></article>
    </section>
    <div className="feedback-locked-page__choices" aria-label="피드백 반영 선택"><button className="is-selected" type="button">이대로 적용할게요</button><button type="button">그대로 둘게요</button></div>
    <div className="feedback-locked-page__overlay" aria-hidden="true" />
    <p className="feedback-locked-page__message">
      <span className="feedback-locked-page__info-icon" aria-hidden="true"><img src={info} alt="" /></span>
      대화가 완료되었습니다. 선택 후 다음 운동부터 반영돼요.
    </p>
    <img className="feedback-locked-page__lock" src={lock} alt="대화가 잠겼습니다" />
  </main></FixedStepFrame>
}
