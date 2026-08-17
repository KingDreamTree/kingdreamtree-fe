import { useEffect, useLayoutEffect, useState, type CSSProperties, type ReactNode } from 'react'

type FixedStepFrameProps = { children: ReactNode; label: string }

/** Renders one 1440 × 1024 Figma screen within the available desktop viewport. */
export function FixedStepFrame({ children, label }: FixedStepFrameProps) {
  const getScale = () => Math.min(1, document.documentElement.clientWidth / 1440, window.innerHeight / 1024)
  const [scale, setScale] = useState(getScale)

  // The onboarding is scrollable, while each analysis step is a single fixed Figma frame.
  // Reset the previous onboarding scroll position before this frame is painted.
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [])

  useEffect(() => {
    const updateScale = () => setScale(getScale())
    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [])

  const canvasStyle = { transform: `scale(${scale})` } as CSSProperties
  return <main className="step-page" aria-label={label}><div className="step-frame" style={{ width: 1440 * scale, height: 1024 * scale }}><div className="step-canvas" style={canvasStyle}><button className="refit-logo" type="button" aria-label="RE:FIT 홈으로 이동" onClick={() => window.dispatchEvent(new Event('refit-logo-click'))}><span>RE:</span><strong>FIT</strong></button>{children}</div></div></main>
}
