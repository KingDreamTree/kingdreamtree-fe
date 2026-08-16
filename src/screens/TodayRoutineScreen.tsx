import { useEffect, useState } from 'react'
import todayRoutineExercise from '../assets/today-routine-dumbbell-bench-press.png'
import todayRoutineNextExercise from '../assets/today-routine-next-exercise.png'
import todayRoutineProgressLine from '../assets/today-routine-progress-line.svg'
import { FixedStepFrame } from '../components/FixedStepFrame'

/** Figma 657:4412 — 오늘 루틴 */
export function TodayRoutineScreen({ onFinish }: { onFinish: () => void }) {
  const [step, setStep] = useState<1 | 2>(1)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isWorkoutComplete, setIsWorkoutComplete] = useState(false)
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    if (!isTransitioning) return
    const timer = window.setTimeout(() => {
      setStep(2)
      setIsTransitioning(false)
    }, 520)
    return () => window.clearTimeout(timer)
  }, [isTransitioning])

  const completeSet = () => {
    if (isTransitioning) return
    if (step === 1) {
      if (prefersReducedMotion) {
        setStep(2)
        return
      }
      setIsTransitioning(true)
      return
    }
    setIsWorkoutComplete(true)
  }

  return <FixedStepFrame label="오늘 루틴"><div className="today-routine-page">
    <p className="today-routine-page__eyebrow">오늘의 루틴</p>
    <h1>오늘 해야 하는 루틴이에요</h1>
    <p className="today-routine-page__notice">완료 버튼을 눌러야 다음 스텝으로 이동할 수 있어요!</p>
    <img className="today-routine-page__progress" src={todayRoutineProgressLine} alt="현재 첫 번째 운동 단계" />
    <button className="today-routine-page__finish" type="button" disabled={!isWorkoutComplete} onClick={onFinish}>운동마치기</button>

    <section className={`today-routine-page__current ${isTransitioning ? 'is-exiting' : ''}`} aria-label={`현재 운동 Step ${step}`}>
      <span>Step {step}</span><h2>덤벨 벤치 프레스</h2><small>10세트 x 5회 x 20kg</small>
      <p>날개뼈를 모아 발로 바닥을<br />밀어내는 것에 신경써주셔야합니다.</p>
      <button type="button">자세가이드</button><img src={step === 1 ? todayRoutineExercise : todayRoutineNextExercise} alt="덤벨 벤치 프레스 동작" />
    </section>

    {step === 1 && <aside className={`today-routine-page__next ${isTransitioning ? 'is-promoting' : ''}`} aria-label="다음 운동">
      <p>Next →</p><h2>덤벨 벤치 프레스</h2><span>날개뼈를 모아 발로 바닥을<br />밀어내는 것에 신경써주셔야합니다.</span><img src={todayRoutineNextExercise} alt="다음 덤벨 벤치 프레스 동작" />
    </aside>}

    <button className={`today-routine-page__complete ${isWorkoutComplete ? 'is-complete' : ''}`} type="button" disabled={isTransitioning || isWorkoutComplete} onClick={completeSet}>세트 완료</button>
  </div></FixedStepFrame>
}
