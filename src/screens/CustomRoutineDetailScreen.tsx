import customRoutineDetailTime from '../assets/custom-routine-detail-time.svg'
import customRoutineDetailWarmup from '../assets/custom-routine-detail-warmup.png'
import { FixedStepFrame } from '../components/FixedStepFrame'

const routineGroups = Array.from({ length: 4 }, () => ({
  title: '웜업 스트레칭',
  description: '5개의 스트레칭',
}))

/** Figma 108:93 — 맞춤 루틴 DAY 1 상세보기 */
export function CustomRoutineDetailScreen({ onPrevious }: { onPrevious: () => void }) {
  return <FixedStepFrame label="맞춤 루틴 상세보기"><div className="custom-routine-detail-page">
    <p className="custom-routine-detail-page__eyebrow">상세보기</p>
    <h1>DAY 1</h1>
    <button className="custom-routine-detail-page__previous" type="button" onClick={onPrevious}>이전 단계</button>
    <p className="custom-routine-detail-page__duration"><img src={customRoutineDetailTime} alt="" />운동시간 <strong>46분</strong></p>
    <section className="custom-routine-detail-page__groups" aria-label="DAY 1 운동 목록">
      {routineGroups.map((group, index) => <article key={index}>
        <img src={customRoutineDetailWarmup} alt="" />
        <div><h2>{group.title}</h2><p>{group.description}</p></div>
      </article>)}
    </section>
  </div></FixedStepFrame>
}
