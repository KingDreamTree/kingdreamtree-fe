import { useState, type DragEvent } from 'react'
import inbodyUpload from '../assets/inbody-upload.svg'
import { FixedStepFrame } from '../components/FixedStepFrame'
import { InbodyWimDialog } from '../components/InbodyWimDialog'
import { PreviousButton } from '../components/PreviousButton'

type InbodyUploadBeforeScreenProps = {
  onUpload: () => void
  onComplete: () => void
  onSkip: () => void
  onPrevious: () => void
}

export function InbodyUploadBeforeScreen({ onUpload, onComplete, onSkip, onPrevious }: InbodyUploadBeforeScreenProps) {
  const [isWimModalOpen, setIsWimModalOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    setIsDragging(true)
  }

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault()
    setIsDragging(false)
    const file = event.dataTransfer.files[0]
    if (!file || (!file.type.startsWith('image/') && !/\.(jpe?g|png|webp|heic)$/i.test(file.name))) return

    const fileInput = document.querySelector<HTMLInputElement>('input.visually-hidden[type="file"]')
    if (!fileInput) return
    const dataTransfer = new DataTransfer()
    dataTransfer.items.add(file)
    fileInput.files = dataTransfer.files
    fileInput.dispatchEvent(new Event('change', { bubbles: true }))
  }

  const startMyDataConnection = () => {
    setIsWimModalOpen(false)
    onUpload()
  }

  return (
    <FixedStepFrame label="인바디 업로드 전">
      <div className="inbody-upload-before-page">
        <p className="step-label">Step 3/3</p>
        <h1>인바디 정보 입력</h1>
        <p className="step-description">정확한 분석을 위해 최근 인바디 측정 결과를 입력해주세요</p>
        <PreviousButton onClick={onPrevious} />

        <button className="inbody-before-skip" type="button" onClick={onSkip}>건너뛰기</button>
        <button className={`inbody-before-dropzone${isDragging ? ' is-dragging' : ''}`} type="button" onClick={onUpload} onDragOver={handleDragOver} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop}>
          <img src={inbodyUpload} alt="" />
          <span>파일을 선택하거나 여기로 끌어다 놓으세요.</span>
        </button>
        <button
          className="inbody-wim-link"
          type="button"
          aria-haspopup="dialog"
          aria-expanded={isWimModalOpen}
          onClick={() => setIsWimModalOpen(true)}
        >
          WIM 회원이신가요?
        </button>
        {/* 이 화면에서는 아직 업로드한 게 없으므로 항상 비활성 — 진행은 업로드 또는 건너뛰기로.
            눌리는데 서버 에러가 뜨는 혼란을 막는다. */}
        <button className="inbody-before-complete" type="button" disabled onClick={onComplete}>
          인바디 입력 완료
        </button>

        <InbodyWimDialog open={isWimModalOpen} onClose={() => setIsWimModalOpen(false)} onConnect={startMyDataConnection} />
      </div>
    </FixedStepFrame>
  )
}
