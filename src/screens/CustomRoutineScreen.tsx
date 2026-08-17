import { useState } from 'react'
import customRoutinePreviousArrow from '../assets/custom-routine-previous-arrow.svg'
import { FixedStepFrame } from '../components/FixedStepFrame'
import type { RoutineDay, RoutineDetail } from '../lib/api'

/** Day 카드의 포커스 문구 — 운동들의 근육군을 요약한다. */
function dayFocus(day: RoutineDay): string {
  const groups = [...new Set(day.exercises.map(exercise => exercise.muscle_group).filter(Boolean))]
  if (groups.length) return groups.slice(0, 2).join(' · ')
  return day.title ?? `운동 ${day.exercises.length}개`
}

type CustomRoutineScreenProps = {
  routine: RoutineDetail | null
  onAdjustDays: () => void
  onViewDay: (day: RoutineDay) => void
  onNext: () => void
}

/** Figma 641:3901 — 맞춤 루틴. 카드·목표·주차는 GET /routines/active 응답에서 온다. */
export function CustomRoutineScreen({ routine, onAdjustDays, onViewDay, onNext }: CustomRoutineScreenProps) {
  const progress = routine?.progress ?? null
  const [week, setWeek] = useState(progress?.cycle_no ?? 1)
  const days = routine?.days ?? []

  return <FixedStepFrame label="맞춤 루틴"><div className="custom-routine-page">
    <p className="custom-routine-page__eyebrow">맞춤루틴 제공</p>
    <h1>목표 체형 레퍼런스</h1>
    <button className="custom-routine-page__adjust" type="button" onClick={onAdjustDays}><img src={customRoutinePreviousArrow} alt="" />운동 일수 조정</button>
    <button className="custom-routine-page__next" type="button" onClick={onNext}>다음 단계</button>

    <section className="custom-routine-page__goal">
      <h2>{routine?.total_cycles ?? 4}주간 핵심 목표</h2>
      <p>{routine?.goal ?? `주 ${routine?.exercise_days_per_week ?? '-'}일 플랜으로 레퍼런스와의 격차를 줄이는 루틴입니다.`}</p>
      {routine?.notice && <p className="custom-routine-page__notice">{routine.notice}</p>}
    </section>

    {/* 주기 모델: Day 1..N을 4주기 반복 — 주차가 달라도 Day 구성은 같고, 진행 중인 주기만 표시가 다르다 */}
    <nav className="custom-routine-page__weeks" aria-label="루틴 주차 선택">{Array.from({ length: routine?.total_cycles ?? 4 }, (_, index) => index + 1).map(item => <button className={week === item ? 'is-selected' : ''} type="button" key={item} onClick={() => setWeek(item)}>{item}주차</button>)}</nav>
    <section className="custom-routine-page__cards" aria-label={`${week}주차 운동 루틴`}>{days.map(day => {
      return <article key={day.day_order}>
        <h2>DAY {day.day_order}</h2><p>{dayFocus(day)}</p><button type="button" onClick={() => onViewDay(day)}>+상세보기</button>
      </article>
    })}</section>

    {progress && <p className="custom-routine-page__progress">진행 {progress.completed_count}/{progress.total_count}회 · {progress.cycle_no}주차 Day {progress.next_day_order} 예정 ({progress.percent}%)</p>}
    {routine?.disclaimer && <p className="custom-routine-page__disclaimer">{routine.disclaimer}</p>}
  </div></FixedStepFrame>
}
