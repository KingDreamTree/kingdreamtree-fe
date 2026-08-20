import { useState } from 'react'
import previousArrow from '../assets/previous-arrow.svg'
import { FixedStepFrame } from '../components/FixedStepFrame'
import type { RoutineDay, RoutineDetail, RoutineNotice } from '../lib/api'
import { displayProgress } from '../lib/routine-progress'

/** 2026-08-20 이전 루틴이 갖고 있는 옛 안내 문구. 그때는 조건별 안내를 **공백 하나로**
 *  이어붙여 한 문단으로 저장해서, 잘라낼 표시가 문구 자체밖에 남지 않았다.
 *  ⚠️ 새로 만든 루틴은 이 표를 타지 않는다 — 서버가 notices 를 채워준다. */
const LEGACY_NOTICES = [
  // 첫 문장이 본문의 일부라서 남긴다.
  { opener: '체지방률 기준으로 감량을 함께 하면', title: '감량을 함께 하는 구성이에요', dropOpener: false },
  // 첫 문장이 곧 소제목이라 빼지 않으면 화면에 두 번 나온다.
  { opener: '매일 운동을 선택하셨네요!', title: '매일 운동을 선택하셨네요', dropOpener: true },
  { opener: '체형 비교 진단 없이 생성된 기본 루틴입니다.', title: '진단 없이 만든 기본 루틴이에요', dropOpener: true },
]

/** 공백으로 이어붙은 옛 한 문단을 아는 문구 위치에서 잘라 안내별로 나눈다.
 *  아는 문구가 하나도 없으면 소제목 없이 통째로 둔다 — 소제목을 지어내지 않는다. */
function splitLegacyBlock(text: string): RoutineNotice[] {
  const hits = LEGACY_NOTICES
    .map(item => ({ ...item, at: text.indexOf(item.opener) }))
    .filter(item => item.at >= 0)
    .sort((a, b) => a.at - b.at)
  if (!hits.length) return [{ title: '', body: text }]
  const notices: RoutineNotice[] = []
  const head = text.slice(0, hits[0].at).trim()
  if (head) notices.push({ title: '', body: head })
  hits.forEach((hit, index) => {
    const stop = index + 1 < hits.length ? hits[index + 1].at : text.length
    const body = text.slice(hit.dropOpener ? hit.at + hit.opener.length : hit.at, stop).trim()
    if (body) notices.push({ title: hit.title, body })
  })
  return notices
}

/** 옛 루틴은 notices 없이 한 덩어리 문자열만 갖고 있다. 백엔드가 «소제목 줄 + 본문»을
 *  빈 줄로 이어 붙여 주므로 먼저 그 규칙으로 되돌리고, 그 형식이 아니면(= 공백으로
 *  이어붙던 더 옛 루틴) 아는 문구 위치에서 자른다. */
function parseLegacyNotice(notice: string | null | undefined): RoutineNotice[] {
  if (!notice) return []
  return notice.split(/\n\s*\n/).flatMap(block => {
    const [first, ...rest] = block.split('\n')
    if (rest.length) return [{ title: first.trim(), body: rest.join(' ').trim() }]
    return splitLegacyBlock(block.trim())
  }).filter(item => item.body)
}

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
  // 서버 값은 100%를 넘을 수 있다 — 표시용으로 다듬는다 (routine-progress 주석 참고)
  const shown = progress ? displayProgress(progress) : null
  const [week, setWeek] = useState(progress?.cycle_no ?? 1)
  const days = routine?.days ?? []
  const focusAreas = routine?.focus_areas?.filter(Boolean) ?? []
  // strategy.body 는 백엔드가 실제로 생성한 루틴(모드 판정·부위별 가중 세트·유산소
  // 여부)에서 조립한 설명이다. 헤드라인은 쓰지 않는다 — "루틴 요약"엔 이 근거
  // 문단 하나만 보여준다. 이 필드 이전 루틴은 null 이므로 기존 폴백을 그대로 쓴다.
  // 안내는 조건마다 따로 붙는다(감량 대상자 / 주 7일 선택자 / 진단 없음). 한 문단으로
  // 이어 붙이면 대상이 다른 이야기가 섞여 읽히지 않아서, 소제목을 살려 따로 그린다.
  const notices = routine?.notices?.length ? routine.notices : parseLegacyNotice(routine?.notice)
  const routineSummary = routine?.strategy?.body ?? (focusAreas.length > 0
    ? `${focusAreas.join('·')} 개선을 우선순위로 두고, 주 ${routine?.exercise_days_per_week ?? '-'}일 운동 일정에 맞춰 구성했어요.`
    : `주 ${routine?.exercise_days_per_week ?? '-'}일 운동 일정과 각 운동의 세트·반복·휴식 구성을 바탕으로 만들었어요.`)

  return <FixedStepFrame label="맞춤 루틴" fitContent><div className="custom-routine-page">
    <p className="custom-routine-page__eyebrow">맞춤 루틴 제공</p>
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
      {notices.map((notice, index) => <div className="custom-routine-page__goal-section custom-routine-page__notice" key={notice.title || index}>
        {notice.title && <h3>{notice.title}</h3>}
        <p>{notice.body}</p>
      </div>)}
    </section>

    {/* 주기 모델: Day 1..N을 4주기 반복 — 주차가 달라도 Day 구성은 같고, 진행 중인 주기만 표시가 다르다 */}
    <div className="custom-routine-page__weeks-row">
      <nav className="custom-routine-page__weeks" aria-label="루틴 주차 선택">{Array.from({ length: routine?.total_cycles ?? 4 }, (_, index) => index + 1).map(item => <button className={week === item ? 'is-selected' : ''} type="button" key={item} onClick={() => setWeek(item)}>{item}주차</button>)}</nav>
      {/* 진행률은 페이지 맨 아래에 한 줄로 있어서 눈에 안 들어왔다. 주차 줄 오른쪽으로
          올려 «무엇을 고르는 줄인가»와 «어디까지 왔나»를 한눈에 같이 보게 한다.
          ⚠️ nav 안에 넣지 않는다 — 진행률은 고를 수 있는 항목이 아니다. */}
      {progress && shown && <div className="custom-routine-page__progress">
        {/* ⚠️ 주차를 빼고 **전체 통산 회차**로 쓴다 (Day 1 … Day 8 …).
            next_day_order 는 주기 안에서 1..N 으로 되돌아오는 값이라 주차 없이 쓰면
            «Day 1» 이 계속 반복된다. completed_count + 1 이 옆의 «N/M회» 와 같은
            기준의 다음 회차다 — 두 숫자가 어긋나지 않는다. */}
        <span className="custom-routine-page__progress-next">Day {shown.nextDay}</span>
        <span className="custom-routine-page__progress-gauge" role="progressbar"
          aria-valuenow={shown.percent} aria-valuemin={0} aria-valuemax={100}
          aria-label={`전체 ${shown.totalCount}회 중 ${shown.completedCount}회 완료`}>
          <span style={{ width: `${shown.percent}%` }} />
        </span>
        <span className="custom-routine-page__progress-count">{shown.completedCount}<i>/{shown.totalCount}회</i></span>
        <strong>{shown.percent}%</strong>
      </div>}
    </div>
    <section className="custom-routine-page__cards" aria-label={`${week}주차 운동 루틴`}>{days.map((day, index) => {
      const dayNumber = (week - 1) * days.length + index + 1
      return <article key={`${week}-${day.day_order}`}>
        <h2>DAY {dayNumber}</h2><p>{dayFocus(day)}</p><button type="button" onClick={() => onViewDay(day)}>+상세보기</button>
      </article>
    })}</section>

    </div>

    {routine?.disclaimer && <p className="custom-routine-page__disclaimer">{routine.disclaimer}</p>}
  </div></FixedStepFrame>
}
