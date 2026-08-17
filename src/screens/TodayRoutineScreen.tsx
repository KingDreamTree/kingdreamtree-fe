import { useEffect, useState } from 'react'
import todayRoutineExercise from '../assets/today-routine-dumbbell-bench-press.png'
import todayRoutineNextExercise from '../assets/today-routine-next-exercise.png'
import todayRoutineProgressLine from '../assets/today-routine-progress-line.svg'
import { FixedStepFrame } from '../components/FixedStepFrame'
import type { RoutineExercise, TodayRoutine } from '../lib/api'

function exerciseDose(exercise: RoutineExercise | undefined): string {
  if (!exercise) return ''
  if (exercise.exercise_kind === 'CARDIO') return `${exercise.duration_min ?? '-'}분`
  const parts: string[] = []
  if (exercise.sets) parts.push(`${exercise.sets}세트`)
  if (exercise.reps) parts.push(`x ${exercise.reps}회`)
  if (exercise.rir !== null && exercise.rir !== undefined) parts.push(`x RIR ${exercise.rir}`)
  return parts.join(' ') || '자유 진행'
}

type TodayRoutineScreenProps = { today: TodayRoutine | null; onFinish: () => void }

/** Figma 657:4412 — 오늘 루틴. 운동 목록은 GET /routines/today의 Day 실데이터로 진행한다. */
export function TodayRoutineScreen({ today, onFinish }: TodayRoutineScreenProps) {
  const exercises = today?.day.exercises ?? []
  const [step, setStep] = useState(0)
  const [isFinalSetComplete, setIsFinalSetComplete] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const current = exercises[step]
  const next = exercises[step + 1]
  const isLastStep = step >= exercises.length - 1
  const isWorkoutComplete = exercises.length > 0 && isFinalSetComplete

  useEffect(() => {
    if (!isTransitioning) return
    const timer = window.setTimeout(() => {
      setStep(value => value + 1)
      setIsTransitioning(false)
    }, 520)
    return () => window.clearTimeout(timer)
  }, [isTransitioning])

  const completeSet = () => {
    if (isTransitioning || isWorkoutComplete) return
    if (isLastStep) {
      setIsFinalSetComplete(true)
      return
    }
    if (prefersReducedMotion) {
      setStep(value => value + 1)
      return
    }
    setIsTransitioning(true)
  }

  return <FixedStepFrame label="오늘 루틴"><div className="today-routine-page">
    <p className="today-routine-page__eyebrow">오늘의 루틴 {today ? `· ${today.progress.cycle_no}주차 Day ${today.day.day_order}` : ''}</p>
    <h1>{today?.day.title ?? '오늘 해야 하는 루틴이에요'}</h1>
    <p className="today-routine-page__notice">완료 버튼을 눌러야 다음 스텝으로 이동할 수 있어요!</p>
    <img className="today-routine-page__progress" src={todayRoutineProgressLine} alt={`운동 ${Math.min(step + 1, exercises.length)} / ${exercises.length} 단계`} />
    <button className="today-routine-page__finish" type="button" disabled={!isWorkoutComplete} onClick={onFinish}>운동마치기</button>

    {current && <section className={`today-routine-page__current ${isTransitioning ? 'is-exiting' : ''} ${isLastStep ? 'is-last-step' : ''}`} aria-label={`현재 운동 Step ${step + 1}`}>
      <span>Step {step + 1}/{exercises.length}</span><h2>{current.name}</h2><small>{exerciseDose(current)}</small>
      <p>{current.note ?? (current.muscle_group ? `${current.muscle_group} 자극에 집중해주세요.` : '정확한 자세에 집중해주세요.')}</p>
      <button type="button">자세가이드</button><img src={current.image_url ?? todayRoutineExercise} alt={`${current.name} 동작`} />
    </section>}

    {next && !isWorkoutComplete && <aside className={`today-routine-page__next ${isTransitioning ? 'is-promoting' : ''}`} aria-label="다음 운동">
      <p>Next →</p><h2>{next.name}</h2><span>{exerciseDose(next)}</span><img src={next.image_url ?? todayRoutineNextExercise} alt={`다음 ${next.name} 동작`} />
    </aside>}

    <button className={`today-routine-page__complete ${isWorkoutComplete ? 'is-complete' : ''}`} type="button" disabled={isTransitioning || isWorkoutComplete || !current} onClick={completeSet}>세트 완료</button>
    {today?.disclaimer && <p className="today-routine-page__disclaimer">{today.disclaimer}</p>}
  </div></FixedStepFrame>
}
