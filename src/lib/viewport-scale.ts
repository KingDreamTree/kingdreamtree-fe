/**
 * 1440px 설계 화면을 지금 창 너비에 맞추는 배율.
 *
 * ⚠️ **브라우저 확대/축소를 상쇄하면 안 된다.** clientWidth 는 CSS 픽셀이라 150% 로
 *    확대하면 값이 2/3 로 줄어든다. 그 값만으로 배율을 잡으면 배율도 같이 2/3 이 되어
 *    실제 크기가 정확히 상쇄되고, 확대해도 화면이 **그대로**다. 종전 동작이 그랬다.
 *
 *    그래서 확대 배수를 다시 곱해 되돌린다. 확대하면 설계 크기가 CSS 픽셀로는 그대로,
 *    화면에서는 그만큼 커진다 — 브라우저 확대의 원래 동작이다.
 *
 * ⚠️ 기준 배율은 **첫 로드 시점**의 devicePixelRatio 다. 레티나(2배)처럼 화면 자체의
 *    배율을 확대로 착각하지 않으려면 절대값이 아니라 변화량을 봐야 한다.
 *    이미 확대한 채로 열면 그 상태가 기준이 된다 — 그 뒤의 확대·축소는 정상 동작한다.
 */
const BASE_PIXEL_RATIO = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1

/** 첫 로드 대비 확대 배수. 100% 면 1, 150% 로 확대하면 1.5. */
export function browserZoom(): number {
  return (window.devicePixelRatio || 1) / BASE_PIXEL_RATIO
}

export function viewportScale(designWidth: number): number {
  return (document.documentElement.clientWidth * browserZoom()) / designWidth
}
