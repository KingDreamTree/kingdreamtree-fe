import { useEffect, useRef, useState } from 'react'

/**
 * 실제 작업 단계에 맞춰 움직이는 진행률.
 *
 * ⚠️ **고정 시간 애니메이션을 쓰지 않는다.** 종전에는 1800ms(결과지 분석)·3500ms(루틴 생성)
 *    뒤 무조건 100%가 됐다. 서버 작업은 그보다 훨씬 오래 걸리는 일이 많아서, 사용자는
 *    "다 끝났다"는 화면을 보면서 한참을 더 기다렸다. 진행률이 거짓말을 하면 없느니만 못하다.
 *
 * 규칙 세 가지
 *   ① 단계마다 자기 구간만 쓴다. 4단계면 0~25 / 25~50 / 50~75 / 75~100.
 *   ② 구간 안에서는 **남은 거리의 일부씩만** 좁힌다(점근). 그래서 오래 걸려도 멈춰
 *      보이지 않고, 아무리 오래 걸려도 구간 끝을 넘지 않는다.
 *   ③ `isComplete` 전에는 절대 100%가 되지 않는다. 이 화면의 핵심 계약이다.
 *   ④ **값은 줄어들지 않는다.** 상한이 내려가면 되돌아가는 게 아니라 그 자리에 멈춘다.
 *
 * ⚠️ 프레임 수가 아니라 **경과 시간**으로 좁힌다. 프레임당 고정 비율로 좁히면
 *    120Hz 화면에서 두 배 빨리 차오른다.
 */

/** 구간 안에서 남은 거리를 좁히는 시간 상수. 클수록 느긋하게 다가간다. */
const APPROACH_MS = 900
/** 작업이 끝난 뒤 100%까지 달려가는 시간 상수. 짧게 잡아야 마무리가 늘어지지 않는다. */
const FINISH_MS = 220
/** 구간 끝에 닿기 직전에서 멈춘다 — 딱 떨어지면 다음 단계로 넘어간 것처럼 보인다. */
const BAND_MARGIN = 1.5

export function useLoadingProgress(phase: number, stepCount: number, isComplete: boolean): number {
  const [progress, setProgress] = useState(0)
  // 렌더마다 값이 바뀌어도 애니메이션 루프는 한 번만 돈다 — ref 로 최신 값을 읽는다.
  const target = useRef({ phase, stepCount, isComplete })
  target.current = { phase, stepCount, isComplete }

  useEffect(() => {
    let frame = 0
    let previous: number | undefined
    let value = 0

    const tick = (timestamp: number) => {
      const elapsed = timestamp - (previous ?? timestamp)
      previous = timestamp

      const { phase: currentPhase, stepCount: steps, isComplete: done } = target.current
      const band = 100 / Math.max(1, steps)
      const ceiling = done
        ? 100
        : Math.min(100 - BAND_MARGIN, (Math.min(currentPhase, steps - 1) + 1) * band - BAND_MARGIN)

      // ⚠️ **뒤로는 가지 않는다.** 상한이 지금 값보다 낮아도 되돌리지 않고 그 자리에 선다.
      //    단계가 내려가는 일(재조회·재시동)은 코드에서 막았지만, 여기서도 한 번 더 잠근다 —
      //    진행률이 뒤로 흐르는 건 사용자 눈에 «되돌아갔다»로 읽혀서 어떤 이유로도 보이면 안 된다.
      if (ceiling <= value) { setProgress(Math.round(value)); frame = window.requestAnimationFrame(tick); return }

      // 지수 접근 — 남은 거리에 비례해 좁히므로 목표를 넘지 않는다.
      const tau = done ? FINISH_MS : APPROACH_MS
      value += (ceiling - value) * (1 - Math.exp(-elapsed / tau))
      if (done && value > 99.5) value = 100

      setProgress(Math.round(value))
      if (!(done && value >= 100)) frame = window.requestAnimationFrame(tick)
    }

    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [])

  return progress
}
