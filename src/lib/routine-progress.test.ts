/**
 * displayProgress 경계값 — `node --test` 로 돈다 (러너 없음, 타입 스트리핑).
 *
 *     npm test
 *
 * ⚠️ 지키려는 것은 하나다: **Day 라벨이 completed_count 로 역산되지 않는다** (#169).
 *    중복 기록이나 옛 user_id 승계로 횟수가 밀려도 라벨은 마지막 완료 기록이
 *    가리키는 자리에 있어야 한다.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { displayProgress } from './routine-progress.ts'
import type { RoutineProgress } from './api.ts'

/** 주 4일 × 4주기 = 16회 루틴의 서버 응답. */
const p = (over: Partial<RoutineProgress>): RoutineProgress => ({
  completed_count: 0, total_count: 16, cycle_no: 1, next_day_order: 1,
  is_completed: false, percent: 0, day_source: 'LAST_LOG', ...over,
})

test('기록이 없으면 Day 1', () => {
  assert.equal(displayProgress(p({})).nextDay, 1)
})

test('1주기 중간 — 주기를 편 통산 회차', () => {
  assert.equal(displayProgress(p({ completed_count: 2, cycle_no: 1, next_day_order: 3 })).nextDay, 3)
})

test('주기 경계 — 2주기 Day 1 은 통산 Day 5', () => {
  assert.equal(displayProgress(p({ completed_count: 4, cycle_no: 2, next_day_order: 1 })).nextDay, 5)
})

test('횟수가 밀려도 라벨은 마지막 기록을 따른다 (역산 금지 — #169)', () => {
  // 더블클릭·승계로 completed_count 만 3 앞선 상태. 종전 구현은 completed+1 = 6 을 찍었다.
  const drifted = p({ completed_count: 5, cycle_no: 1, next_day_order: 3 })
  assert.equal(displayProgress(drifted).nextDay, 3)
  assert.notEqual(displayProgress(drifted).nextDay, drifted.completed_count + 1)
})

test('다 끝냈으면 마지막 회차에 머문다', () => {
  assert.equal(displayProgress(p({ completed_count: 16, is_completed: true, cycle_no: 4, next_day_order: 1 })).nextDay, 16)
})

test('총 회차를 넘지 않는다 — 일수 조정으로 분모가 줄어든 경우', () => {
  // 주7일로 37회 한 뒤 주4일로 조정 → 분모 16, 분자 37 (실측 231%)
  const shrunk = displayProgress(p({ completed_count: 37, total_count: 16, cycle_no: 4, next_day_order: 4 }))
  assert.equal(shrunk.completedCount, 16)
  assert.equal(shrunk.percent, 100)
  assert.ok(shrunk.nextDay <= 16)
})
