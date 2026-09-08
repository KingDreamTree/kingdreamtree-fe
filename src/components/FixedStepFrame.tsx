import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { RefitHomeLogo } from './RefitHomeLogo'

const DESIGN_WIDTH = 1440
const DESIGN_HEIGHT = 1024

type FixedStepFrameProps = {
  children: ReactNode
  label: string
  /**
   * 내용이 설계 높이(1024px)를 넘으면 액자를 그만큼 늘리고 **세로 스크롤을 연다.**
   *
   * ⚠️ **넘치지 않으면 아무것도 달라지지 않는다** — 창에 딱 맞고 스크롤도 없다.
   *    넘친 만큼만 아래로 길어져서 그때 스크롤이 생긴다.
   *    (이 장치가 없으면 페이지가 height:1024 + overflow:hidden 이라 잘려나간다.)
   *
   * ⚠️ 기본값 false — 서버 문구 길이에 따라 세로로 자라는 화면에서만 켠다.
   *    늘어날 일이 없는 화면에 관측기를 달아둘 이유가 없다.
   */
  fitContent?: boolean
}

/** Renders one 1440 × 1024 Figma screen within the available desktop viewport. */
export function FixedStepFrame({ children, label, fitContent = false }: FixedStepFrameProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const [canvasHeight, setCanvasHeight] = useState(DESIGN_HEIGHT)
  const [scale, setScale] = useState(1)

  // The onboarding is scrollable, while each analysis step is a single fixed Figma frame.
  // Reset the previous onboarding scroll position before this frame is painted.
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [])

  // ⚠️ .step-frame은 절대 스크롤되면 안 된다 — overflow:hidden은 스크롤바만 숨길
  //    뿐, scrollLeft/scrollTop이 프로그램적으로(포커스 이동 등의 브라우저 기본
  //    "스크롤해서 보여주기" 동작으로) 바뀌는 건 막지 못한다. 이 화면이 매 턴
  //    다시 마운트되던 시절엔 그때마다 새 DOM이라 값이 저절로 0이었는데, 한
  //    화면을 계속 재사용하도록 고치고 나니(대화가 쌓이는 채팅 화면 등) 그
  //    드리프트가 누적되어 화면이 옆으로 밀려 잘리는 채로 남았다. 매 렌더 후
  //    확인해서 0으로 되돌린다 — 의존성 배열 없이 매번 돈다.
  useEffect(() => {
    const frame = frameRef.current
    if (frame && (frame.scrollLeft !== 0 || frame.scrollTop !== 0)) {
      frame.scrollLeft = 0
      frame.scrollTop = 0
    }
  })

  /**
   * 내용 높이를 재서 필요한 만큼만 늘린다.
   *
   * ⚠️ scrollHeight 를 쓴다 — getBoundingClientRect 는 아래 transform: scale 이 이미
   *    반영된 값이라, 배율 계산에 넣으면 서로 물고 늘어져 진동한다.
   */
  useLayoutEffect(() => {
    const canvas = canvasRef.current
    if (!fitContent || !canvas) return
    const measure = () => setCanvasHeight(Math.max(DESIGN_HEIGHT, canvas.scrollHeight))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [fitContent])

  /**
   * 배율은 **설계 높이(1024) 기준**으로만 잡는다.
   *
   * ⚠️ 늘어난 내용 높이로 배율을 잡으면 안 된다 — 내용이 길어질수록 화면이 작아지고
   *    스크롤은 영영 생기지 않는다. 설계 높이 기준이어야 «평소엔 창에 딱 맞고,
   *    1024 를 넘은 만큼만 아래로 넘쳐 스크롤이 생긴다».
   *
   * ⚠️ useLayoutEffect 여야 한다. useEffect 면 scale=1(초기값)로 첫 페인트가
   *    나간 뒤 다음 틱에야 축소돼, 화면(특히 매 턴 다시 마운트되는 대화 카드)이
   *    "커졌다 줄어드는" 플래시로 보인다 — 페인트 전에 계산을 끝낸다.
   */
  useLayoutEffect(() => {
    const updateScale = () => setScale(Math.min(
      1,
      document.documentElement.clientWidth / DESIGN_WIDTH,
      window.innerHeight / DESIGN_HEIGHT,
    ))
    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [])

  const canvasStyle = {
    transform: `scale(${scale})`,
    ...(fitContent ? { height: 'auto', minHeight: `${DESIGN_HEIGHT}px`, overflow: 'visible' } : null),
  } as CSSProperties

  return <main className={`step-page ${fitContent ? 'step-page--fit' : ''}`.trim()} aria-label={label}>
    <div className="step-frame" ref={frameRef} style={{ width: DESIGN_WIDTH * scale, height: canvasHeight * scale }}>
      <div className="step-canvas" ref={canvasRef} style={canvasStyle}><RefitHomeLogo />{children}</div>
    </div>
  </main>
}
