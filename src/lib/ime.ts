import type { KeyboardEvent } from 'react'

/**
 * 한글 입력 중 Enter로 폼이 조기 제출되는 것을 막는다.
 *
 * ⚠️ keydown 시점의 `isComposing`만 보는 방식은 못 믿는다 — 조합을 막 끝낸
 *    바로 그 Enter의 keydown에서 브라우저마다(특히 macOS 한글) 이미
 *    isComposing이 false로 내려가 있는 경우가 있다. ref + setTimeout으로
 *    미뤄봐도 여전히 새는 사례가 있었다(2026-08-18 실측 — 실제 사용자
 *    환경에서 재현됨, 이 리포의 자동화 브라우저는 진짜 조합 이벤트를
 *    못 만들어 재현이 안 됐다).
 *
 * 그래서 경쟁 자체를 없앤다: keydown에서는 Enter의 네이티브 제출을
 * **무조건** 막고(조합 여부와 무관하게), 실제 제출 여부는 keyup에서
 * 판단한다. keyup은 물리 키를 뗀 시점이라 그때는 조합이 이미 확정
 * 끝난 뒤라 isComposing이 어느 브라우저에서도 안정적으로 false다.
 */
export function useEnterToSubmit(submit: () => void) {
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') event.preventDefault()
  }
  const onKeyUp = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.nativeEvent.isComposing) submit()
  }
  return { onKeyDown, onKeyUp }
}
