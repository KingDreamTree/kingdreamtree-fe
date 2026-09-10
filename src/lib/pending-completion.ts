/**
 * «완료 기록을 보내는 중» 표시. **새로고침을 넘어가는 잠금**이다.
 *
 * ⚠️ 연타 잠금(completingRef)은 React ref 라 **페이지 수명 안에서만** 산다.
 *    그런데 'feedback' 은 RESUMABLE_VIEWS 에 있어서 새로고침으로 되살아난다:
 *
 *      ① [완료] → POST 나감
 *      ② 응답 전에 새로고침 → ref 가 메모리와 함께 사라짐
 *      ③ feedback 화면 복원 → 다시 [완료]
 *      ④ getTodayRoutine() 이 이제 **다음 Day** 를 준다 (①이 이미 기록했으니)
 *      ⑤ 다음 Day 로 기록 → workout_log_uniq 는 (루틴, 주기, Day) 라 **통과**
 *
 *    하루에 이틀치가 들어가고, 게이지·코치가 하지도 않은 Day 를 가리킨다
 *    (#169 «프론트가 Day 를 전진시켜 재전송한다»가 이 경로다).
 *    서버측 중복 거부는 넣지 않기로 결정됐으므로 프론트가 막는다.
 *
 * ⚠️ sessionStorage 를 쓴다 — localStorage 면 탭을 닫아도 남아 다음 방문까지
 *    따라온다. 이 잠금의 수명은 «이 탭에서 보낸 그 요청» 하나다.
 */
export const PENDING_COMPLETION_KEY = 'refit.completing'

export type PendingCompletion = { sessionId: string; before: number }

export function readPendingCompletion(): PendingCompletion | null {
  try {
    const raw = sessionStorage.getItem(PENDING_COMPLETION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PendingCompletion
    return typeof parsed?.sessionId === 'string' && typeof parsed?.before === 'number' ? parsed : null
  } catch { return null }   // 사파리 프라이빗 등 — 잠금만 포기한다
}

export function writePendingCompletion(value: PendingCompletion) {
  try { sessionStorage.setItem(PENDING_COMPLETION_KEY, JSON.stringify(value)) } catch { /* 위와 같음 */ }
}

export function clearPendingCompletion() {
  try { sessionStorage.removeItem(PENDING_COMPLETION_KEY) } catch { /* 위와 같음 */ }
}
