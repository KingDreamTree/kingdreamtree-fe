import { useEffect, useState } from 'react'
import todayRoutineExercise from '../assets/today-routine-dumbbell-bench-press.png'
import todayRoutineNextExercise from '../assets/today-routine-next-exercise.png'
import { FixedStepFrame } from '../components/FixedStepFrame'
import { PreviousButton } from '../components/PreviousButton'
import { ExerciseMedia } from '../components/ExerciseMedia'
import type { RoutineExercise, TodayRoutine } from '../lib/api'
import { displayProgress } from '../lib/routine-progress'

function exerciseDose(exercise: RoutineExercise | undefined): string {
  if (!exercise) return ''
  if (exercise.exercise_kind === 'CARDIO') return `${exercise.duration_min ?? '-'}분`
  const parts: string[] = []
  if (exercise.sets) parts.push(`${exercise.sets}세트`)
  if (exercise.reps) parts.push(`x ${exercise.reps}회`)
  if (exercise.rir !== null && exercise.rir !== undefined) parts.push(`· ${exercise.rir}회 더 할 수 있는 강도`)
  if (exercise.rest_sec) parts.push(`· 휴식 ${exercise.rest_sec}초`)
  return parts.join(' ') || '자유 진행'
}

/** 카드 전환 길이. App.css 의 today-routine 전환 시간과 **같은 값이어야 한다** —
 *  여기가 짧으면 애니메이션이 끝나기 전에 카드가 교체되고, 길면 다 끝난 화면이 멈춰 있다. */
const CARD_TRANSITION_MS = 520

type TodayRoutineScreenProps = { today: TodayRoutine | null; onFinish: () => void; onPrevious: () => void }

/** Figma 657:4412 — 오늘 루틴. 운동 목록은 GET /routines/today의 Day 실데이터로 진행한다. */
export function TodayRoutineScreen({ today, onFinish, onPrevious }: TodayRoutineScreenProps) {
  const exercises = today?.day.exercises ?? []
  const [step, setStep] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const current = exercises[step]
  const next = exercises[step + 1]
  const isLastStep = step >= exercises.length - 1
  // 다음 카드가 **마지막 스텝**이면 현재 자리는 전체 폭(1178px)이다. 이걸 안 알려주면
  // 824px 까지만 커졌다가 교체되는 순간 1178px 로 튄다.
  const isNextLastStep = step + 1 >= exercises.length - 1

  useEffect(() => {
    if (!isTransitioning) return
    const timer = window.setTimeout(() => {
      setStep(value => value + 1)
      setIsTransitioning(false)
    }, CARD_TRANSITION_MS)
    return () => window.clearTimeout(timer)
  }, [isTransitioning])

  const completeSet = () => {
    if (isTransitioning) return
    if (isLastStep) {
      onFinish()
      return
    }
    if (prefersReducedMotion) {
      setStep(value => value + 1)
      return
    }
    setIsTransitioning(true)
  }

  return <FixedStepFrame label="오늘 루틴"><div className="today-routine-page">
    <PreviousButton onClick={onPrevious} />
    {/* ⚠️ 주차를 빼고 **전체 통산 회차**로 쓴다 — 맞춤 루틴 화면의 표기와 같은 기준이다.
        day_order 는 주기 안에서 1..N 으로 되돌아오는 값이라 주차 없이 쓰면 2주차에도
        «Day 1» 이 다시 나온다. completed_count + 1 이 «지금 할 회차»다. */}
    <p className="today-routine-page__eyebrow">오늘의 루틴 {today ? `· Day ${displayProgress(today.progress).nextDay}` : ''}</p>
    <h1>{today?.day.title ?? '오늘 해야 하는 루틴이에요'}</h1>
    <p className="today-routine-page__notice">{isLastStep ? '운동 마치기 버튼을 누르면 피드백 화면으로 넘어갈 수 있어요!' : '완료 버튼을 눌러야 다음 스텝으로 이동할 수 있어요!'}</p>
    <div className="today-routine-page__progress" role="progressbar" aria-label={`운동 ${Math.min(step + 1, exercises.length)} / ${exercises.length} 단계`} aria-valuemin={0} aria-valuemax={exercises.length} aria-valuenow={Math.min(step + 1, exercises.length)}>
      {exercises.map((exercise, index) => <span className={index < step ? 'is-complete' : index === step ? 'is-active' : ''} key={`${exercise.name}-${index}`} />)}
    </div>

    {/* ⚠️ key={step} 이 이 전환의 핵심이다. 키가 없으면 두 카드가 **같은 DOM 노드를
        재사용**하는데, step 이 바뀌며 is-promoting/is-exiting 이 떨어지는 순간 전환이
        거꾸로 재생된다 — 방금 현재 자리로 올라온 카드가 오른쪽으로 되돌아가고, 새 현재
        카드는 화면 왼쪽 밖에서 미끄러져 들어온다. 그게 "뚝뚝 끊긴다"의 정체였다.
        키를 주면 전환이 끝난 자리에서 옛 노드가 사라지고 새 노드가 그 자리에 나타난다 —
        ⚠️ 두 카드는 형제라서 키가 서로 달라야 한다. 둘 다 {step} 만 주면 React 가
           "같은 키를 가진 자식이 둘"이라고 경고하고, 노드를 섞어 쓰거나 하나를 빠뜨린다.
        승격된 카드와 새 현재 카드의 최종 모습이 같도록 CSS 를 맞춰뒀으므로 이음매가 없다. */}
    {current && <section key={`current-${step}`} className={`today-routine-page__current ${isTransitioning ? 'is-exiting' : ''} ${isLastStep ? 'is-last-step' : ''}`} aria-label={`현재 운동 Step ${step + 1}`}>
      <span>Step {step + 1}/{exercises.length}</span><h2>{current.name}</h2><small>{exerciseDose(current)}</small>
      <p>{current.note ?? (current.muscle_group ? `${current.muscle_group} 자극에 집중해주세요.` : '정확한 자세에 집중해주세요.')}</p>
      <button type="button">자세 가이드</button><ExerciseMedia videoUrl={current.video_url} imageUrl={current.image_url} fallback={todayRoutineExercise} label={`${current.name} 동작`} />
    </section>}

    {/* data-next-step: 승격 중 Step 배지에 들어갈 문구. 종전에는 CSS 가 'Step 2' 를
        박아두고 있어서 3스텝 이후에도 매번 "Step 2" 가 스쳐 지나갔다. */}
    {next && !isLastStep && <aside key={`next-${step}`}
      className={`today-routine-page__next ${isTransitioning ? 'is-promoting' : ''} ${isNextLastStep ? 'is-promoting-last' : ''}`} aria-label="다음 운동">
      <p data-next-step={`Step ${step + 2}/${exercises.length}`}>Next →</p><h2>{next.name}</h2><span>{exerciseDose(next)}</span><ExerciseMedia videoUrl={next.video_url} imageUrl={next.image_url} fallback={todayRoutineNextExercise} label={`다음 ${next.name} 동작`} />
    </aside>}

    <button className="today-routine-page__complete" type="button" disabled={isTransitioning || !current} onClick={completeSet}>{isLastStep ? '운동 마치기' : '세트 완료'}</button>
    {today?.disclaimer && <p className="today-routine-page__disclaimer">{today.disclaimer}</p>}
  </div></FixedStepFrame>
}
