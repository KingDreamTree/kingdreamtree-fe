import type { RoutineProgress } from './api'

/**
 * 화면에 쓸 진행률 — **총 회차를 넘지 않게 다듬는다.**
 *
 * ⚠️ 서버 값은 100% 를 넘을 수 있다. 설계가 그렇다.
 *    · completed_count 는 세션의 운동 기록을 **전부** 센다 (버전 무관 — 피드백으로
 *      루틴 버전이 갈려도 진행도가 0 으로 리셋되지 않게 하려는 의도된 결정이다).
 *    · total_count 는 **지금 루틴의** exercise_days_per_week × 4 다.
 *    그래서 «운동 일수 조정»으로 주 7일 → 주 4일처럼 줄이면 분모만 작아진다.
 *    실제로 37/16 = 231% 가 화면에 떴다.
 *
 * ⚠️ 여기서 다듬는 것은 **표시**뿐이다. 근본 해결은 서버가 진행도를 셀 때 총 회차로
 *    상한을 두는 것이다 (refit-backend: routine_repo.progress).
 *    프론트에서 값을 고쳐 저장하지는 않는다 — 기록 자체는 서버가 가진 그대로 둔다.
 */
export type DisplayProgress = {
  completedCount: number
  totalCount: number
  percent: number
  /** 다음에 할 회차 (1부터). 다 끝냈으면 마지막 회차에 머문다. */
  nextDay: number
}

export function displayProgress(progress: RoutineProgress): DisplayProgress {
  const total = Math.max(0, progress.total_count)
  const completed = Math.max(0, Math.min(progress.completed_count, total))
  return {
    completedCount: completed,
    totalCount: total,
    // ⚠️ 서버 percent 를 그대로 쓰지 않는다 — 그 값이 231% 로 오는 경우가 있다.
    //    다듬은 회차에서 다시 계산해야 «N/M회» 와 «%» 가 서로 어긋나지 않는다.
    percent: total > 0 ? Math.round((completed / total) * 100) : 0,
    nextDay: total > 0 ? Math.min(completed + 1, total) : 1,
  }
}
