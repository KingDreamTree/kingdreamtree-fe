/**
 * 새로고침을 넘어가는 «완료 보내는 중» 잠금 — `npm test`.
 *
 * ⚠️ 지키려는 것: 보내는 중에 새로고침해도 **같은 완료가 두 번 기록되지 않는다** (#169).
 *    판정은 «서버의 completed_count 가 보내기 전보다 늘었는가» 하나다.
 */
import assert from 'node:assert/strict'
import { beforeEach, test } from 'node:test'

import {
  clearPendingCompletion, PENDING_COMPLETION_KEY,
  readPendingCompletion, writePendingCompletion,
} from './pending-completion.ts'

/** sessionStorage 스텁 — node 에는 없다. */
function installStorage(impl?: Partial<Storage>) {
  const map = new Map<string, string>()
  ;(globalThis as { sessionStorage?: unknown }).sessionStorage = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    ...impl,
  }
  return map
}

beforeEach(() => { installStorage() })

test('쓰고 읽으면 그대로 돌아온다', () => {
  writePendingCompletion({ sessionId: 's1', before: 4 })
  assert.deepEqual(readPendingCompletion(), { sessionId: 's1', before: 4 })
})

test('잠금이 없으면 null', () => {
  assert.equal(readPendingCompletion(), null)
})

test('지우면 사라진다 — 응답이 온 정상 경로', () => {
  writePendingCompletion({ sessionId: 's1', before: 4 })
  clearPendingCompletion()
  assert.equal(readPendingCompletion(), null)
})

test('깨진 값은 null — 잠금 하나 때문에 화면이 죽지 않는다', () => {
  installStorage().set(PENDING_COMPLETION_KEY, '{ not json')
  assert.equal(readPendingCompletion(), null)
})

test('모양이 다른 값도 null', () => {
  installStorage().set(PENDING_COMPLETION_KEY, JSON.stringify({ sessionId: 's1' }))
  assert.equal(readPendingCompletion(), null)
})

test('sessionStorage 가 던져도 화면은 살아야 한다 (사파리 프라이빗)', () => {
  installStorage({
    getItem: () => { throw new Error('denied') },
    setItem: () => { throw new Error('denied') },
    removeItem: () => { throw new Error('denied') },
  })
  assert.doesNotThrow(() => writePendingCompletion({ sessionId: 's1', before: 1 }))
  assert.doesNotThrow(() => clearPendingCompletion())
  assert.equal(readPendingCompletion(), null)
})

// ── 복원 때의 판정 (App.tsx 복원 효과와 같은 식) ──
const landed = (p: { sessionId: string; before: number } | null, sessionId: string, count: number) =>
  !!p && p.sessionId === sessionId && count > p.before

test('개수가 늘었으면 «이미 들어갔다» — feedback 에 두면 안 된다', () => {
  writePendingCompletion({ sessionId: 's1', before: 4 })
  assert.equal(landed(readPendingCompletion(), 's1', 5), true)
})

test('개수가 그대로면 도착 안 함 — 다시 누를 수 있어야 한다', () => {
  writePendingCompletion({ sessionId: 's1', before: 4 })
  assert.equal(landed(readPendingCompletion(), 's1', 4), false)
})

test('다른 세션의 잠금은 남의 것 — 무시한다', () => {
  writePendingCompletion({ sessionId: 's1', before: 4 })
  assert.equal(landed(readPendingCompletion(), 's2', 99), false)
})
