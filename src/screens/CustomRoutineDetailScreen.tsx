import customRoutineDetailTime from '../assets/custom-routine-detail-time.svg'
import customRoutineDetailWarmup from '../assets/custom-routine-detail-warmup.png'
import { useState } from 'react'
import { FixedStepFrame } from '../components/FixedStepFrame'
import { ExerciseMedia } from '../components/ExerciseMedia'
import type { RoutineDay } from '../lib/api'

const WARMUP_SECONDS = 5 * 60
const EXERCISE_SETUP_SECONDS = 3 * 60
const REP_SECONDS_AT_TEN_REPS = 45
const FORMULA_DEFAULT_REST_SECONDS = 2 * 60
const EXERCISE_BUFFER_SECONDS = 3 * 60
const FORMULA_TRANSITION_SECONDS = 2 * 60

type RoutineExercise = RoutineDay['exercises'][number]

function isTimeBasedExercise(exercise: RoutineExercise): boolean {
  return exercise.exercise_kind.toUpperCase() === 'CARDIO'
    || (exercise.duration_min !== null && exercise.duration_min > 0 && !exercise.reps)
}

function calculateExerciseDurationSeconds(exercise: RoutineExercise): number {
  const sets = Math.max(exercise.sets ?? 1, 1)
  const isCardio = exercise.exercise_kind.toUpperCase() === 'CARDIO'
  if (isCardio) return Math.max(exercise.duration_min ?? 0, 0) * 60
  const isTimed = isTimeBasedExercise(exercise)
  const performanceSeconds = isTimed
    ? Math.max(exercise.duration_min ?? 0, 0) * 60 * sets
    : sets * (Math.max(exercise.reps ?? 0, 0) / 10) * REP_SECONDS_AT_TEN_REPS
  const restSeconds = Math.max(exercise.rest_sec ?? FORMULA_DEFAULT_REST_SECONDS, 0) * Math.max(sets - 1, 0)
  return EXERCISE_SETUP_SECONDS + performanceSeconds + restSeconds + EXERCISE_BUFFER_SECONDS
}

function calculateWorkoutDurationSeconds(day: RoutineDay): number {
  const exercises = day.exercises
  if (exercises.length === 0) return 0
  const exerciseSeconds = exercises.reduce((total, exercise) => total + calculateExerciseDurationSeconds(exercise), 0)
  const transitionSeconds = Math.max(exercises.length - 1, 0) * FORMULA_TRANSITION_SECONDS
  return WARMUP_SECONDS + exerciseSeconds + transitionSeconds
}

function estimatedDuration(day: RoutineDay | null): number | null {
  if (!day) return null
  const totalSeconds = calculateWorkoutDurationSeconds(day)
  return totalSeconds > 0 ? Math.ceil(totalSeconds / 60) : null
}

/** 이 운동에서 들 무게. 맨몸이거나 인바디가 없으면 null 이라 줄이 안 나온다.
 *  ⚠️ «로 시작» 이라고 부르지 않는다 — 백엔드는 kg 을 저장하지 않고 배율(load_adjust)만
 *     남겨 조회할 때마다 다시 계산한다. 피드백에서 «무겁다» 가 나오면 배율이 내려가
 *     이 값 자체가 바뀌므로, 조정된 뒤에는 시작 무게가 아니라 지금 들 무게다. */
function loadText(exercise: RoutineDay['exercises'][number]): string | null {
  const load = exercise.load_guide
  if (!load) return null
  return load.min_kg === load.max_kg ? `${load.min_kg}kg` : `${load.min_kg}~${load.max_kg}kg`
}

/** 세트·횟수·휴식을 한 줄 요약으로. 유산소는 시간 기준. */
function exerciseSummary(exercise: RoutineDay['exercises'][number]): string {
  if (exercise.exercise_kind === 'CARDIO') return `${exercise.duration_min ?? '-'}분`
  const parts: string[] = []
  if (exercise.sets) parts.push(`${exercise.sets}세트`)
  if (exercise.reps) parts.push(`${exercise.reps}회`)
  if (exercise.rest_sec) parts.push(`휴식 ${exercise.rest_sec}초`)
  return parts.join(' × ') || '자유 진행'
}

/** 오른쪽 정보판 제목이 한 줄에 들어가는 글자 수. 폭 344px(424 - 좌우 여백 40)을
 *  글자당 폭으로 나눈 값이다 — 22.372px 기준 15자, 19px 기준 18자.
 *  ⚠️ 카탈로그에는 30자짜리 이름도 있어서 줄바꿈을 아예 없앨 수는 없다.
 *     한 줄에 들어갈 만한 이름이 굳이 접히는 것만 막는다. */
function titleSizeClass(name: string): string {
  if (name.length > 18) return ' is-very-long'
  if (name.length > 15) return ' is-long'
  return ''
}

type CustomRoutineDetailScreenProps = { day: RoutineDay | null; onPrevious: () => void }

/** Figma 108:93 — 맞춤 루틴 DAY 상세보기. 운동 목록은 선택한 Day의 실데이터. */
export function CustomRoutineDetailScreen({ day, onPrevious }: CustomRoutineDetailScreenProps) {
  const exercises = day?.exercises ?? []
  const [selectedIndex, setSelectedIndex] = useState(0)
  const selected = exercises[selectedIndex] ?? exercises[0]
  const duration = estimatedDuration(day)
  return <FixedStepFrame label="맞춤 루틴 상세 보기"><div className="custom-routine-detail-page">
    <p className="custom-routine-detail-page__eyebrow">상세 보기</p>
    <h1>DAY {day?.day_order ?? 1}</h1>
    <button className="custom-routine-detail-page__previous" type="button" onClick={onPrevious}>이전 단계</button>
    <p className="custom-routine-detail-page__duration"><img src={customRoutineDetailTime} alt="" />예상 운동시간 <strong>{duration ?? '-'}분</strong></p>
    <section className="custom-routine-detail-page__groups" aria-label={`DAY ${day?.day_order ?? 1} 운동 목록`}>
      {exercises.map((exercise, index) => <article className={selected?.order_index === exercise.order_index ? 'is-selected' : ''} key={exercise.order_index} tabIndex={0} onMouseEnter={() => setSelectedIndex(index)} onFocus={() => setSelectedIndex(index)} onClick={() => setSelectedIndex(index)}>
        <img src={exercise.image_url ?? customRoutineDetailWarmup} alt="" />
        <div>
          <h2>{exercise.name}</h2>
          <p>{exerciseSummary(exercise)}{exercise.muscle_group ? ` · ${exercise.muscle_group}` : ''}</p>
          {/* ⚠️ 서버 note 는 RIR 을 되풀이하는 문장(«N회를 마쳤을 때 …»)이라 쓰지 않는다.
              여기서는 «얼마로 시작해서 어떻게 올리는지»만 말한다. */}
          {loadText(exercise) && <p className="custom-routine-detail-page__note">
            <em>{loadText(exercise)}</em> · 가볍게 느껴지면 한 단계 올리세요
          </p>}
        </div>
      </article>)}
      {exercises.length === 0 && <p className="custom-routine-detail-page__empty">이 Day의 운동 정보를 불러오지 못했어요.</p>}
    </section>
    {selected && <aside className="custom-routine-detail-page__info" aria-live="polite">
      <h2 className={`custom-routine-detail-page__info-title${titleSizeClass(selected.name)}`}>{selected.name}</h2>
      <dl>
        {selected.sets && <div><dt>세트 수</dt><dd>{selected.sets}세트</dd></div>}
        {selected.reps && <div><dt>반복 횟수</dt><dd>{selected.reps}회</dd></div>}
        {/* ⚠️ 값만 적는다. 피드백으로 무게가 조정되면 그 값이 여기로 그대로 내려오므로,
            «시작»이라고 부르면 조정된 뒤에는 틀린 말이 된다. 올리는 법 안내는 왼쪽
            목록의 한 줄이 담당한다. load_guide 가 null 이면(맨몸·인바디 없음) 줄이 없다. */}
        {selected.load_guide && <div>
          <dt>무게</dt>
          <dd title={selected.load_guide.basis}>
            {selected.load_guide.min_kg === selected.load_guide.max_kg
              ? `${selected.load_guide.min_kg}kg`
              : `${selected.load_guide.min_kg}~${selected.load_guide.max_kg}kg`}
          </dd>
        </div>}
        {selected.rest_sec && <div><dt>세트 사이 휴식</dt><dd>{selected.rest_sec}초</dd></div>}
      </dl>
      <ExerciseMedia videoUrl={selected.video_url} imageUrl={selected.image_url} fallback={customRoutineDetailWarmup} label={`${selected.name} 동작`} />
    </aside>}
  </div></FixedStepFrame>
}
