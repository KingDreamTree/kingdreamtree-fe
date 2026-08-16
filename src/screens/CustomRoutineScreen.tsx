import { useState } from 'react'
import customRoutinePreviousArrow from '../assets/custom-routine-previous-arrow.svg'
import { FixedStepFrame } from '../components/FixedStepFrame'

const routineDays = [
  { focus: '가슴 · 삼두' },
  { focus: '등 · 이두' },
  { focus: '하체 · 코어' },
  { focus: '어깨 · 가슴' },
  { focus: '가슴 · 삼두' },
  { focus: '가슴 · 삼두' },
  { focus: '가슴 · 삼두' },
]

/** Figma 641:3901 — 맞춤 루틴 */
export function CustomRoutineScreen({ workoutDays, onAdjustDays, onViewDayOne, onNext }: { workoutDays: number; onAdjustDays: () => void; onViewDayOne: () => void; onNext: () => void }) {
  const [week, setWeek] = useState(1)
  const visibleDays = routineDays.slice(0, workoutDays)

  return <FixedStepFrame label="맞춤 루틴"><div className="custom-routine-page">
    <p className="custom-routine-page__eyebrow">맞춤루틴 제공</p>
    <h1>목표 체형 레퍼런스</h1>
    <button className="custom-routine-page__adjust" type="button" onClick={onAdjustDays}><img src={customRoutinePreviousArrow} alt="" />운동 일수 조정</button>
    <button className="custom-routine-page__next" type="button" onClick={onNext}>다음 단계</button>

    <section className="custom-routine-page__goal"><h2>4주간 핵심 목표</h2><p>어깨, 팔, 다리 중심으로 레퍼런스와 비교하여 주 {workoutDays}일 플랜으로 근육 회복을 극대화하는 루틴을 생성합니다.</p></section>

    <nav className="custom-routine-page__weeks" aria-label="루틴 주차 선택">{[1, 2, 3, 4].map(item => <button className={week === item ? 'is-selected' : ''} type="button" key={item} onClick={() => setWeek(item)}>{item}주차</button>)}</nav>
    <section className="custom-routine-page__cards" aria-label={`${week}주차 운동 루틴`}>{visibleDays.map((day, index) => <article className={index === 0 ? 'is-highlighted' : ''} key={index}>
      <h2>DAY {index + 1}</h2><p>{day.focus}</p><button type="button" onClick={index === 0 ? onViewDayOne : undefined}>+상세보기</button>
    </article>)}</section>
  </div></FixedStepFrame>
}
