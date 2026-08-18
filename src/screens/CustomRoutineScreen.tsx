import { useState } from 'react'
import previousArrow from '../assets/previous-arrow.svg'
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
  const focusAreas = routine?.focus_areas?.filter(Boolean) ?? []
  // strategy 는 백엔드가 실제로 생성한 루틴(모드·가중 세트)에서 조립한 설명이다.
  // 이 필드 이전 루틴은 null 이므로 기존 goal/focus_areas 폴백을 그대로 쓴다.
  const routineSummary = routine?.strategy?.headline ?? routine?.goal ?? `주 ${routine?.exercise_days_per_week ?? '-'}일 운동으로 목표 체형에 가까워지는 ${routine?.total_cycles ?? 4}주 루틴입니다.`
  const routineEvidence = routine?.strategy?.body ?? (focusAreas.length > 0
    ? `${focusAreas.join('·')} 개선을 우선순위로 두고, 주 ${routine?.exercise_days_per_week ?? '-'}일 운동 일정에 맞춰 구성했어요.`
    : `주 ${routine?.exercise_days_per_week ?? '-'}일 운동 일정과 각 운동의 세트·반복·휴식 구성을 바탕으로 만들었어요.`)

  return <FixedStepFrame label="맞춤 루틴" fitContent><div className="custom-routine-page">
    <p className="custom-routine-page__eyebrow">맞춤루틴 제공</p>
      <h1>목표 체형 레퍼런스</h1>
    <button className="custom-routine-page__adjust" type="button" onClick={onAdjustDays}><img src={previousArrow} alt="" />운동 일수 조정</button>
    <button className="custom-routine-page__next" type="button" onClick={onNext}>다음 단계</button>

    {/* ⚠️ 목표 상자 · 주차 · 카드는 **한 흐름으로 묶어야 한다.** 종전에는 셋 다 절대
        좌표(291 / 512 / 597px)로 고정돼 있었는데, 근거 문단은 길이가 데이터마다
        달라서 상자가 세로로 자란다. 상자가 512px 을 넘는 순간 주차 버튼이 상자
        위로 겹쳐 올라왔다. 흐름으로 두면 상자가 얼마나 자라든 간격이 유지된다. */}
    <div className="custom-routine-page__body">
    <section className="custom-routine-page__goal">
      <h2>{routine?.total_cycles ?? 4}주간 핵심 목표</h2>
      <div className="custom-routine-page__goal-section">
        <h3>루틴 요약</h3>
        <p>{routineSummary}</p>
      </div>
      <div className="custom-routine-page__goal-section">
        <h3>근거</h3>
        <p>{routineEvidence}</p>
      </div>
      {routine?.notice && <p className="custom-routine-page__notice">{routine.notice}</p>}
    </section>

    {/* 주기 모델: Day 1..N을 4주기 반복 — 주차가 달라도 Day 구성은 같고, 진행 중인 주기만 표시가 다르다 */}
    <div className="custom-routine-page__weeks-row">
      <nav className="custom-routine-page__weeks" aria-label="루틴 주차 선택">{Array.from({ length: routine?.total_cycles ?? 4 }, (_, index) => index + 1).map(item => <button className={week === item ? 'is-selected' : ''} type="button" key={item} onClick={() => setWeek(item)}>{item}주차</button>)}</nav>
      {/* 진행률은 페이지 맨 아래에 한 줄로 있어서 눈에 안 들어왔다. 주차 줄 오른쪽으로
          올려 «무엇을 고르는 줄인가»와 «어디까지 왔나»를 한눈에 같이 보게 한다.
          ⚠️ nav 안에 넣지 않는다 — 진행률은 고를 수 있는 항목이 아니다. */}
      {progress && <div className="custom-routine-page__progress">
        <span className="custom-routine-page__progress-next">{progress.cycle_no}주차 Day {progress.next_day_order}</span>
        <span className="custom-routine-page__progress-gauge" role="progressbar"
          aria-valuenow={progress.percent} aria-valuemin={0} aria-valuemax={100}
          aria-label={`전체 ${progress.total_count}회 중 ${progress.completed_count}회 완료`}>
          <span style={{ width: `${Math.max(0, Math.min(100, progress.percent))}%` }} />
        </span>
        <span className="custom-routine-page__progress-count">{progress.completed_count}<i>/{progress.total_count}회</i></span>
        <strong>{progress.percent}%</strong>
      </div>}
    </div>
    <section className="custom-routine-page__cards" aria-label={`${week}주차 운동 루틴`}>{days.map(day => {
      return <article key={day.day_order}>
        <h2>DAY {day.day_order}</h2><p>{dayFocus(day)}</p><button type="button" onClick={() => onViewDay(day)}>+상세보기</button>
      </article>
    })}</section>

    </div>

    {routine?.disclaimer && <p className="custom-routine-page__disclaimer">{routine.disclaimer}</p>}
  </div></FixedStepFrame>
}
