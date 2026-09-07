/**
 * 왼쪽 위 RE:FIT 로고 — 누르면 온보딩으로 돌아간다.
 *
 * ⚠️ **모든 화면에 있어야 한다.** 종전에는 FixedStepFrame 안에 JSX 로 박혀 있어서,
 *    그 틀을 쓰지 않는 화면(비교 분석)에만 로고가 없었다. 사용자가 그 화면에서만
 *    처음으로 돌아갈 길을 잃는다. 컴포넌트로 빼두면 틀을 안 쓰는 화면도 한 줄로 붙는다.
 *
 * ⚠️ onClick 은 App 이 듣는 커스텀 이벤트다 — 화면마다 콜백을 내려주지 않아도 되도록
 *    이렇게 뒀다. App 의 'refit-logo-click' 리스너와 짝이다.
 */
export function RefitHomeLogo() {
  return <button className="refit-logo" type="button" aria-label="RE:FIT 홈으로 이동"
    onClick={() => window.dispatchEvent(new Event('refit-logo-click'))}>
    <span>RE:</span><strong>FIT</strong>
  </button>
}
