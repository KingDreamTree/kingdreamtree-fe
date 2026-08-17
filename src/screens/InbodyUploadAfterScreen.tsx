import inbodyCalendar from '../assets/inbody-calendar.svg'
import inbodyPreviousArrow from '../assets/inbody-previous-arrow.svg'
import inbodyRequiredDot from '../assets/inbody-required-dot.svg'
import { InbodyGenderSelector } from '../components/InbodyGenderSelector'
import { FixedStepFrame } from '../components/FixedStepFrame'

type InbodyAfterField = { label: string; value: string; unit?: string; required?: boolean }
type InbodyUploadAfterScreenProps = { onConfirm: () => void; onPrevious: () => void }

const composition: InbodyAfterField[] = [{ label: '체중', value: '68.7', unit: 'kg' }, { label: 'BMI', value: '23.2', unit: 'kg/m²' }, { label: '골격근량', value: '28.4', unit: 'kg' }, { label: '체지방률', value: '22.7', unit: '%' }, { label: '체지방량', value: '15.6', unit: 'kg' }, { label: '기초대사량', value: '1524', unit: 'kcal' }]
const muscle: InbodyAfterField[] = [{ label: '오른팔', value: '2.65' }, { label: '왼팔', value: '2.55' }, { label: '몸통', value: '2.13' }, { label: '오른다리', value: '8.35' }, { label: '왼다리', value: '8.25' }]
const fat: InbodyAfterField[] = [{ label: '오른팔', value: '0.8' }, { label: '왼팔', value: '0.8' }, { label: '몸통', value: '0.8' }, { label: '오른다리', value: '0.8' }, { label: '왼다리', value: '0.8' }]

function InbodyAfterInput({ field }: { field: InbodyAfterField }) {
  return <label className="inbody-after-field"><span>{field.label}{field.unit && <small>({field.unit})</small>}{field.required && <img src={inbodyRequiredDot} alt="필수" />}</span><input aria-label={field.label} defaultValue={field.value} /></label>
}

export function InbodyUploadAfterScreen({ onConfirm, onPrevious }: InbodyUploadAfterScreenProps) {
  return <FixedStepFrame label="인바디-업로드 후"><div className="inbody-after-page">
    <p className="step-label">Step 3/3</p><h1>인바디 정보 입력</h1><p className="step-description">AI가 인식한 결과입니다. 틀린 부분이 있다면 터치하여 수정해 주세요.</p><section className="inbody-after-smi"><span>SMI <small>(kg/m²)</small></span><strong>8.25</strong><small>* 골격근량 ÷ 신장²</small></section>
    <section className="inbody-after-basic"><h2>1. 기본 정보</h2><InbodyAfterInput field={{ label: '신장', value: '172', unit: 'cm', required: true }} /><InbodyAfterInput field={{ label: '나이', value: '33', unit: '세' }} /><label className="inbody-after-field"><span>성별</span><InbodyGenderSelector className="inbody-after-gender" /></label><label className="inbody-after-field"><span>측정일</span><div className="inbody-after-date"><input aria-label="측정일" defaultValue="2025-08-12" /><img src={inbodyCalendar} alt="달력" /></div></label></section>
    <section className="inbody-after-column inbody-after-composition"><h2>2. 체성분</h2>{composition.map(field => <InbodyAfterInput key={field.label} field={field} />)}</section><section className="inbody-after-column inbody-after-muscle"><h2>3. 부위별 근육량</h2>{muscle.map(field => <InbodyAfterInput key={field.label} field={field} />)}</section><section className="inbody-after-column inbody-after-fat"><h2>4. 부위별 체지방량</h2>{fat.map(field => <InbodyAfterInput key={field.label} field={field} />)}</section>
    <button className="inbody-after-confirm" type="button" onClick={onConfirm}>확인 완료</button><button className="inbody-after-previous" type="button" onClick={onPrevious}><img src={inbodyPreviousArrow} alt="" />이전 단계</button><p className="inbody-after-note">* 이 값으로 진행 및 확인 기록이 저장됩니다.</p>
  </div></FixedStepFrame>
}
