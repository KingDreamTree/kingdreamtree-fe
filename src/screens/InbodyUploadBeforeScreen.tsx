import inbodyInfo from '../assets/inbody-info.svg'
import inbodyUpload from '../assets/inbody-upload.svg'
import { FixedStepFrame } from '../components/FixedStepFrame'

type InbodyUploadBeforeScreenProps = { onUpload: () => void; onComplete: () => void }

export function InbodyUploadBeforeScreen({ onUpload, onComplete }: InbodyUploadBeforeScreenProps) {
  return <FixedStepFrame label="인바디-업로드 전"><div className="inbody-upload-before-page">
    <p className="step-label">Step 3/3</p><h1>인바디 정보 입력</h1><p className="step-description">정확한 분석을 위해 최근 인바디 측정 결과를 입력해주세요</p>
    <button className="inbody-before-skip" type="button">건너뛰기</button>
    <button className="inbody-before-dropzone" type="button" onClick={onUpload}><img src={inbodyUpload} alt="" /><span>파일을 선택하거나 여기로 끌어다 놓으세요.</span></button>
    <button className="inbody-wim-link" type="button">WIM 회원이신가요?</button>
    <button className="inbody-before-complete" type="button" onClick={onComplete}>인바디 입력 완료</button>
    <section className="inbody-wim-modal" role="dialog" aria-modal="true" aria-labelledby="inbody-wim-title"><span className="inbody-wim-modal__icon"><img src={inbodyInfo} alt="" /></span><h2 id="inbody-wim-title">WIM 회원이신가요?</h2><p>WIM 회원이시면 인바디 정보를 연동하여<br />업로드 할 수 있어요!</p><button type="button" onClick={onUpload}>마이데이터 연동하기</button></section>
  </div></FixedStepFrame>
}
