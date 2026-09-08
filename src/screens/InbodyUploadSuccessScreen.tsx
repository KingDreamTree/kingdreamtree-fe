import { useEffect, useState } from 'react'
import inbodyUploadSuccessCheck from '../assets/inbody-upload-success-check.svg'
import inbodyUploadSuccessRing from '../assets/inbody-upload-success-ring.svg'
import { FixedStepFrame } from '../components/FixedStepFrame'
import { InbodyWimDialog } from '../components/InbodyWimDialog'
import { PreviousButton } from '../components/PreviousButton'

type InbodyUploadSuccessScreenProps = { onChangePhoto: () => void; onStart: () => Promise<void>; onSkip: () => void; onPrevious: () => void }

export function InbodyUploadSuccessScreen({ onChangePhoto, onStart, onSkip, onPrevious }: InbodyUploadSuccessScreenProps) {
  const [isWimModalOpen, setIsWimModalOpen] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [isStarting, setIsStarting] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setIsReady(true), 180)
    return () => window.clearTimeout(timer)
  }, [])

  const startAnalysis = async () => {
    if (isStarting) return
    setIsStarting(true)
    try {
      await onStart()
    } finally {
      setIsStarting(false)
    }
  }

  const startMyDataConnection = () => {
    setIsWimModalOpen(false)
    onChangePhoto()
  }

  return <FixedStepFrame label="인바디 업로드 성공"><div className="inbody-upload-success-page">
    <p className="step-label">Step 3/3</p><h1>인바디 정보 입력</h1><p className="step-description">정확한 분석을 위해 최근 인바디 측정 결과를 입력해 주세요.</p><PreviousButton onClick={onPrevious} />
    <button className="inbody-before-skip" type="button" onClick={onSkip}>건너뛰기</button>
    <button className="inbody-upload-success-dropzone" type="button" onClick={onChangePhoto}><img className="inbody-upload-success-ring" src={inbodyUploadSuccessRing} alt="" /><img className="inbody-upload-success-check" src={inbodyUploadSuccessCheck} alt="" /><strong>사진이 업로드되었습니다!</strong><small>다른 사진으로 변경하려면 클릭하세요</small></button>
    <button className="inbody-wim-link" type="button" aria-haspopup="dialog" aria-expanded={isWimModalOpen} onClick={() => setIsWimModalOpen(true)}>WIM 회원이신가요?</button><button className={`inbody-upload-success-start${isReady ? ' is-ready' : ''}`} type="button" disabled={!isReady || isStarting} onClick={() => void startAnalysis()}>{isStarting ? '인바디 결과 확인 중…' : 'AI 분석 비교 시작 →'}</button>
    <InbodyWimDialog open={isWimModalOpen} onClose={() => setIsWimModalOpen(false)} onConnect={startMyDataConnection} />
  </div></FixedStepFrame>
}
