import customRoutineDetailTime from '../assets/custom-routine-detail-time.svg'
import customRoutineDetailWarmup from '../assets/custom-routine-detail-warmup.png'
import { FixedStepFrame } from '../components/FixedStepFrame'
import type { RoutineDay } from '../lib/api'

/** 세트·횟수·휴식을 한 줄 요약으로. 유산소는 시간 기준 (중량 kg은 서버가 제공하지 않음 — rir만). */
function exerciseSummary(exercise: RoutineDay['exercises'][number]): string {
  if (exercise.exercise_kind === 'CARDIO') return `${exercise.duration_min ?? '-'}분`
  const parts: string[] = []
  if (exercise.sets) parts.push(`${exercise.sets}세트`)
  if (exercise.reps) parts.push(`${exercise.reps}회`)
  if (exercise.rir !== null && exercise.rir !== undefined) parts.push(`RIR ${exercise.rir}`)
  if (exercise.rest_sec) parts.push(`휴식 ${exercise.rest_sec}초`)
  return parts.join(' × ') || '자유 진행'
}

type CustomRoutineDetailScreenProps = { day: RoutineDay | null; onPrevious: () => void }

/** Figma 108:93 — 맞춤 루틴 DAY 상세보기. 운동 목록은 선택한 Day의 실데이터. */
export function CustomRoutineDetailScreen({ day, onPrevious }: CustomRoutineDetailScreenProps) {
  const exercises = day?.exercises ?? []
  return <FixedStepFrame label="맞춤 루틴 상세보기"><div className="custom-routine-detail-page">
    <p className="custom-routine-detail-page__eyebrow">상세보기</p>
    <h1>DAY {day?.day_order ?? 1}</h1>
    <button className="custom-routine-detail-page__previous" type="button" onClick={onPrevious}>이전 단계</button>
    <p className="custom-routine-detail-page__duration"><img src={customRoutineDetailTime} alt="" />운동시간 <strong>{day?.estimated_duration_min ?? '-'}분</strong></p>
    <section className="custom-routine-detail-page__groups" aria-label={`DAY ${day?.day_order ?? 1} 운동 목록`}>
      {exercises.map(exercise => <article key={exercise.order_index}>
        <img src={exercise.image_url ?? customRoutineDetailWarmup} alt="" />
        <div>
          <h2>{exercise.name}</h2>
          <p>{exerciseSummary(exercise)}{exercise.muscle_group ? ` · ${exercise.muscle_group}` : ''}</p>
          {exercise.note && <p className="custom-routine-detail-page__note">{exercise.note}</p>}
        </div>
      </article>)}
      {exercises.length === 0 && <p className="custom-routine-detail-page__empty">이 Day의 운동 정보를 불러오지 못했어요.</p>}
    </section>
  </div></FixedStepFrame>
}
