import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

/** 첫 화면에 실제로 쓰는 글꼴 조합. 로고(Isamanru) + 본문·버튼(Pretendard). */
const CRITICAL_FONTS = ['700 190px Isamanru', '700 28px Pretendard', '500 28px Pretendard']

/** Pretendard 는 unicode-range 로 쪼개진 dynamic subset 이라, **표본 글자를 같이 넘겨야**
 *  그 글자가 속한 조각까지 받는다. 첫 화면 문구에서 뽑았다. */
const FONT_SAMPLE = 'RE:FIT 원하는 체형의 사진을 선택하고 나의 정보를 입력하면 AI가 운동 루틴을 제공합니다'

/** CDN 이 느리거나 죽어도 화면이 안 뜨면 안 된다. 여기서 끊고 그냥 그린다. */
const FONT_TIMEOUT_MS = 1500

/**
 * 폰트가 도착한 뒤에 첫 렌더를 시작한다.
 * 먼저 그려두면 시스템 기본 글꼴로 한 번 그려졌다가 갈아끼워지면서 글꼴이 바뀌어 보인다.
 * 두 번째 방문부터는 캐시라 대기 시간이 사실상 0 이다.
 */
function waitForFonts(): Promise<unknown> {
  if (!document.fonts) return Promise.resolve()
  const loaded = Promise.all(CRITICAL_FONTS.map(font => document.fonts.load(font, FONT_SAMPLE)))
    .catch(() => undefined)
  return Promise.race([loaded, new Promise(resolve => window.setTimeout(resolve, FONT_TIMEOUT_MS))])
}

void waitForFonts().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
