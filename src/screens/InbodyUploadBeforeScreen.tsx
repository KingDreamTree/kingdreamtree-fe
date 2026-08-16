import { useState } from 'react'
import inbodyUpload from '../assets/inbody-upload.svg'
import { FixedStepFrame } from '../components/FixedStepFrame'
import { InbodyWimDialog } from '../components/InbodyWimDialog'

type InbodyUploadBeforeScreenProps = {
  onUpload: () => void
  onComplete: () => void
  onSkip: () => void
}

export function InbodyUploadBeforeScreen({ onUpload, onComplete, onSkip }: InbodyUploadBeforeScreenProps) {
  const [isWimModalOpen, setIsWimModalOpen] = useState(false)

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

        <button className="inbody-before-skip" type="button" onClick={onSkip}>건너뛰기</button>
        <button className="inbody-before-dropzone" type="button" onClick={onUpload}>
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
        <button className="inbody-before-complete" type="button" onClick={onComplete}>
          인바디 입력 완료
        </button>

        <InbodyWimDialog open={isWimModalOpen} onClose={() => setIsWimModalOpen(false)} onConnect={startMyDataConnection} />
      </div>
    </FixedStepFrame>
  )
}
