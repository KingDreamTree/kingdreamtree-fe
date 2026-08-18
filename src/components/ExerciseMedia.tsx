/**
 * 운동 시연 미디어 — 영상이 있으면 영상, 없으면 사진.
 *
 * ⚠️ `video_url` 은 null 일 수 있다 (백엔드 2026-08-17 안내). 지금은 카탈로그 200개가
 *    전부 갖고 있지만 카탈로그가 바뀌면 없는 운동이 생긴다 — 사진 폴백을 지우지 말 것.
 *
 * ⚠️ muted 없이는 브라우저가 자동재생을 막는다. playsInline 이 없으면 iOS 에서
 *    영상이 전체화면으로 튀어나온다. 둘 다 «있으면 좋은» 속성이 아니라 필수다.
 *
 * ⚠️ video 에는 alt 가 없다. 스크린리더에는 role="img" + aria-label 로 알린다 —
 *    소리도 없고 조작할 것도 없는 반복 재생이라 그림과 같은 취급이 맞다.
 */
type ExerciseMediaProps = {
  videoUrl: string | null | undefined
  imageUrl: string | null | undefined
  /** 둘 다 없을 때 쓸 기본 이미지 */
  fallback: string
  label: string
  className?: string
}

export function ExerciseMedia({ videoUrl, imageUrl, fallback, label, className = '' }: ExerciseMediaProps) {
  if (videoUrl) {
    return <video className={className} src={videoUrl} role="img" aria-label={label}
      autoPlay loop muted playsInline preload="metadata" />
  }
  return <img className={className} src={imageUrl ?? fallback} alt={label} />
}
