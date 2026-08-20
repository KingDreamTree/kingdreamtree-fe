import customRoutineDetailTime from '../assets/custom-routine-detail-time.svg'
import customRoutineDetailWarmup from '../assets/custom-routine-detail-warmup.png'
import { useState } from 'react'
import { FixedStepFrame } from '../components/FixedStepFrame'
import { PreviousButton } from '../components/PreviousButton'
import { ExerciseMedia } from '../components/ExerciseMedia'
import type { RoutineDay } from '../lib/api'

function exerciseDurationMin(exercise: RoutineDay['exercises'][number]): number {
  if (exercise.exercise_kind === 'CARDIO') return exercise.duration_min ?? 0
  const sets = exercise.sets ?? 0
  const reps = exercise.reps ?? 0
  const restSeconds = exercise.rest_sec ?? 0
  return Math.ceil((sets * reps * 4 + Math.max(sets - 1, 0) * restSeconds) / 60)
}

function estimatedDuration(day: RoutineDay | null): number | null {
  if (!day) return null
  if (day.estimated_duration_min && day.estimated_duration_min > 0) return day.estimated_duration_min
  const exerciseMinutes = day.exercises.reduce((total, exercise) => total + exerciseDurationMin(exercise), 0)
  return exerciseMinutes > 0 ? exerciseMinutes + Math.max(day.exercises.length - 1, 0) : null
}

/** 세트·횟수·휴식을 한 줄 요약으로. 유산소는 시간 기준 (중량 kg은 서버가 제공하지 않음 — rir만). */
function exerciseSummary(exercise: RoutineDay['exercises'][number]): string {
  if (exercise.exercise_kind === 'CARDIO') return `${exercise.duration_min ?? '-'}분`
  const parts: string[] = []
  if (exercise.sets) parts.push(`${exercise.sets}세트`)
  if (exercise.reps) parts.push(`${exercise.reps}회`)
  if (exercise.rir !== null && exercise.rir !== undefined) parts.push(`${exercise.rir}회 더 할 수 있는 강도`)
  if (exercise.rest_sec) parts.push(`휴식 ${exercise.rest_sec}초`)
  return parts.join(' × ') || '자유 진행'
}

type CustomRoutineDetailScreenProps = { day: RoutineDay | null; onPrevious: () => void }

/** Figma 108:93 — 맞춤 루틴 DAY 상세보기. 운동 목록은 선택한 Day의 실데이터. */
export function CustomRoutineDetailScreen({ day, onPrevious }: CustomRoutineDetailScreenProps) {
  const exercises = day?.exercises ?? []
  const [selectedIndex, setSelectedIndex] = useState(0)
  const selected = exercises[selectedIndex] ?? exercises[0]
  const duration = estimatedDuration(day)
  return <FixedStepFrame label="맞춤 루틴 상세보기"><div className="custom-routine-detail-page">
    <p className="custom-routine-detail-page__eyebrow">상세보기</p>
    <h1>DAY {day?.day_order ?? 1}</h1>
    <PreviousButton className="custom-routine-detail-page__previous" onClick={onPrevious} />
    <p className="custom-routine-detail-page__duration"><img src={customRoutineDetailTime} alt="" />예상 운동시간 <strong>{duration ?? '-'}분</strong></p>
    <section className="custom-routine-detail-page__groups" aria-label={`DAY ${day?.day_order ?? 1} 운동 목록`}>
      {exercises.map((exercise, index) => <article className={selected?.order_index === exercise.order_index ? 'is-selected' : ''} key={exercise.order_index} tabIndex={0} onMouseEnter={() => setSelectedIndex(index)} onFocus={() => setSelectedIndex(index)} onClick={() => setSelectedIndex(index)}>
        <img src={exercise.image_url ?? customRoutineDetailWarmup} alt="" />
        <div>
          <h2>{exercise.name}</h2>
          <p>{exerciseSummary(exercise)}{exercise.muscle_group ? ` · ${exercise.muscle_group}` : ''}</p>
          {exercise.note && <p className="custom-routine-detail-page__note">{exercise.note}</p>}
        </div>
      </article>)}
      {exercises.length === 0 && <p className="custom-routine-detail-page__empty">이 Day의 운동 정보를 불러오지 못했어요.</p>}
    </section>
    {selected && <aside className="custom-routine-detail-page__info" aria-live="polite">
      <h2>{selected.name}</h2>
      <dl>
        {selected.sets && <div><dt>세트 수</dt><dd>{selected.sets}세트</dd></div>}
        {selected.reps && <div><dt>반복 횟수</dt><dd>{selected.reps}회</dd></div>}
        {selected.rir !== null && selected.rir !== undefined && <div><dt>운동 강도</dt><dd>{selected.rir}회 더 할 수 있는 여유</dd></div>}
        {selected.rest_sec && <div><dt>세트 사이 휴식</dt><dd>{selected.rest_sec}초</dd></div>}
      </dl>
      {/* 목록 썸네일은 사진 그대로 둔다 — 한 화면에서 영상을 여러 개 동시에 돌릴 이유가 없다 */}
      <ExerciseMedia videoUrl={selected.video_url} imageUrl={selected.image_url} fallback={customRoutineDetailWarmup} label={`${selected.name} 동작`} />
    </aside>}
  </div></FixedStepFrame>
}
