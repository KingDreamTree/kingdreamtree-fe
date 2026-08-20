type ExerciseGuideDialogProps = { open: boolean; videoUrl: string | null | undefined; name: string; onClose: () => void }

/** "자세 가이드" 버튼 — 시연 영상(video_url)을 크게 재생한다. 바깥을 클릭하면 닫힌다. */
export function ExerciseGuideDialog({ open, videoUrl, name, onClose }: ExerciseGuideDialogProps) {
  if (!open || !videoUrl) return null
  return <>
    <button className="exercise-guide-backdrop" type="button" aria-label="자세 가이드 닫기" onClick={onClose} />
    <section className="exercise-guide-modal" role="dialog" aria-modal="true" aria-label={`${name} 자세 가이드`}>
      <video src={videoUrl} controls autoPlay loop playsInline />
    </section>
  </>
}
