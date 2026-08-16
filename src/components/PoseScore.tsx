import poseScoreRing from '../assets/pose-score-ring.svg'

const SCORE_RING_CIRCUMFERENCE = 2 * Math.PI * 61.5

/** 점수에 비례해 차오르는 링 — 0점이면 비어 있고 100점이면 가득 찬다. */
export function PoseScore({ score }: { score: number }) {
  const filled = Math.max(0, Math.min(100, score)) / 100
  return <div className="pose-score" aria-label={`일치도 ${score}점`}>
    <img src={poseScoreRing} alt="" />
    <svg className="pose-score__fill" viewBox="0 0 133 133" aria-hidden="true">
      <circle cx="66.5" cy="66.5" r="61.5" fill="none" stroke="#4BC27D" strokeWidth="11" strokeLinecap="round"
        strokeDasharray={SCORE_RING_CIRCUMFERENCE} strokeDashoffset={SCORE_RING_CIRCUMFERENCE * (1 - filled)}
        transform="rotate(-90 66.5 66.5)" />
    </svg>
    <strong>{score.toFixed(1)} <small>점</small></strong>
  </div>
}
