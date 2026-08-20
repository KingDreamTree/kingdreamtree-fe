import { useRef } from 'react'
import type { KeyboardEvent } from 'react'

/**
 * 채팅 입력의 Enter 전송 — 한글 IME 와 충돌하지 않게 (카톡과 같은 감각).
 *
 * ⚠️ 이전(2026-08-18) keyup 방식은 방향이 반대였다. IME 가 소비한 Enter —
 *    조합 확정, 추천 단어 선택 — 는 keydown 이 'Process'(229)로 와서 막히지만
 *    **keyup 은 항상 진짜 'Enter' + isComposing=false 로 온다.** 그래서 추천
 *    단어를 Enter 로 고르기만 해도 메시지가 나갔다 — "타이핑 중인데 지 혼자
 *    보내진다"의 정체. keyup 은 판정 근거가 될 수 없다.
 *
 * 판정은 keydown 에서 한다. "이 Enter 를 IME 가 소비했는가"만 보면 된다:
 *
 *   IME 소비 (전송 금지)          — keyCode 229 / isComposing / 조합 중 ref
 *   진짜 Enter (전송)             — 그 외 전부
 *
 * 플랫폼별로 카톡과 이렇게 맞는다:
 *   macOS  조합 중 Enter    → compositionend 가 keydown 보다 먼저 와서
 *                            isComposing=false 로 도착 → 확정+전송 (카톡 동일)
 *   macOS  후보창 Enter     → 229 → 선택만 (카톡 동일)
 *   Windows 추천/확정 Enter → 229 → 확정만. 전송은 다음 Enter (웹 표준 동작,
 *                            Slack·Discord 웹과 동일 — 멋대로 나가는 것보다
 *                            한 번 더 누르는 쪽이 낫다)
 *
 * keydown 에서 Enter 의 기본 동작은 **무조건** 막는다 — 폼 네이티브 제출이
 * 같은 Enter 로 한 번 더 나가는 이중 전송을 봉쇄한다.
 */
export function useEnterToSubmit(submit: () => void) {
  // isComposing 만으로 부족한 브라우저(구형 안드로이드 등) 대비 이중 추적
  const composingRef = useRef(false)

  const onCompositionStart = () => {
    composingRef.current = true
  }
  const onCompositionEnd = () => {
    composingRef.current = false
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    const imeConsumed =
      event.nativeEvent.isComposing ||
      event.nativeEvent.keyCode === 229 ||
      composingRef.current
    if (!imeConsumed) submit()
  }

  return { onKeyDown, onCompositionStart, onCompositionEnd }
}
