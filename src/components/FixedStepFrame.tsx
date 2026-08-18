import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { RefitHomeLogo } from './RefitHomeLogo'

const DESIGN_WIDTH = 1440
const DESIGN_HEIGHT = 1024

type FixedStepFrameProps = {
  children: ReactNode
  label: string
  /**
   * 내용이 설계 높이(1024px)를 넘을 때만 액자를 그만큼 늘린다.
   *
   * ⚠️ **넘치지 않으면 아무것도 달라지지 않는다** — 높이도 배율도 종전과 같다.
   *    화면 크기를 바꾸는 장치가 아니라, 잘려나가는 것을 막는 안전장치다.
   *    (페이지가 height:1024 + overflow:hidden 이라 넘치면 스크롤도 없이 잘린다.)
   *
   * ⚠️ 기본값 false — 서버 문구 길이에 따라 세로로 자라는 화면에서만 켠다.
   *    늘어날 일이 없는 화면에 관측기를 달아둘 이유가 없다.
   */
  fitContent?: boolean
}

/** Renders one 1440 × 1024 Figma screen within the available desktop viewport. */
export function FixedStepFrame({ children, label, fitContent = false }: FixedStepFrameProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [canvasHeight, setCanvasHeight] = useState(DESIGN_HEIGHT)
  const [scale, setScale] = useState(1)

  // The onboarding is scrollable, while each analysis step is a single fixed Figma frame.
  // Reset the previous onboarding scroll position before this frame is painted.
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [])

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

  useEffect(() => {
    const updateScale = () => setScale(Math.min(
      1,
      document.documentElement.clientWidth / DESIGN_WIDTH,
      window.innerHeight / canvasHeight,
    ))
    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [canvasHeight])

  const canvasStyle = {
    transform: `scale(${scale})`,
    ...(fitContent ? { height: 'auto', minHeight: `${DESIGN_HEIGHT}px`, overflow: 'visible' } : null),
  } as CSSProperties

  return <main className="step-page" aria-label={label}>
    <div className="step-frame" style={{ width: DESIGN_WIDTH * scale, height: canvasHeight * scale }}>
      <div className="step-canvas" ref={canvasRef} style={canvasStyle}><RefitHomeLogo />{children}</div>
    </div>
  </main>
}
