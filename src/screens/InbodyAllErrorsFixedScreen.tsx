import inbodyCalendar from '../assets/inbody-calendar.svg'
import inbodySuccessCheck from '../assets/inbody-all-errors-fixed-check.svg'
import previousArrow from '../assets/previous-arrow.svg'
import inbodyRequiredDot from '../assets/inbody-required-dot.svg'
import { InbodyGenderSelector } from '../components/InbodyGenderSelector'
import { FixedStepFrame } from '../components/FixedStepFrame'

type Field = { label: string; value: string; unit?: string }

const composition: Field[] = [{ label: '체중', value: '68.7', unit: 'kg' }, { label: 'BMI', value: '23.2', unit: 'kg/m²' }, { label: '골격근량', value: '28.4', unit: 'kg' }, { label: '체지방률', value: '22.7', unit: '%' }, { label: '체지방량', value: '15.6', unit: 'kg' }, { label: '기초대사량', value: '1524', unit: 'kcal' }]
const muscle: Field[] = [{ label: '오른팔 (kg)', value: '2.65' }, { label: '왼팔 (kg)', value: '2.55' }, { label: '몸통 (kg)', value: '2.13' }, { label: '오른다리 (kg)', value: '8.35' }, { label: '왼다리 (kg)', value: '8.25' }]
const fat: Field[] = [{ label: '오른팔 (kg)', value: '0.8' }, { label: '왼팔 (kg)', value: '0.8' }, { label: '몸통 (kg)', value: '0.8' }, { label: '오른다리 (kg)', value: '0.8' }, { label: '왼다리 (kg)', value: '0.8' }]

function FixedField({ field, required = false }: { field: Field; required?: boolean }) {
  return <label className="inbody-fixed-field"><span>{field.label}{field.unit && <small>({field.unit})</small>}{required && <img src={inbodyRequiredDot} alt="필수" />}</span><div><input aria-label={field.label} defaultValue={field.value} /></div></label>
}

type InbodyAllErrorsFixedScreenProps = { onConfirm: () => void; onPrevious: () => void }

export function InbodyAllErrorsFixedScreen({ onConfirm, onPrevious }: InbodyAllErrorsFixedScreenProps) {
  return <FixedStepFrame label="인바디-모든오류수정"><div className="inbody-fixed-page">
    <p className="step-label">Step 3/3</p><h1>인바디 정보 입력</h1><p className="step-description">현재 값으로 비교 분석이 진행되니 틀린 부분이 있으면 수정해 주세요.</p>
    <section className="inbody-fixed-guide" role="status"><span><img src={inbodySuccessCheck} alt="" /></span><div><strong>성공적으로 수정되었습니다!</strong><p>확인 완료 버튼을 눌러주세요.</p></div></section>
    <section className="inbody-fixed-smi"><span>SMI <small>(kg/m²)</small></span><strong>8.25</strong><small>* 골격근량 ÷ 신장²</small></section>
    <section className="inbody-fixed-basic"><h2>1. 기본 정보</h2><FixedField field={{ label: '신장', value: '172', unit: 'cm' }} required /><FixedField field={{ label: '나이', value: '33', unit: '세' }} /><label className="inbody-fixed-field"><span>성별</span><InbodyGenderSelector className="inbody-fixed-gender" /></label><label className="inbody-fixed-field"><span>측정일</span><div className="inbody-fixed-date"><input aria-label="측정일" defaultValue="2025-08-12" /><img src={inbodyCalendar} alt="달력" /></div></label></section>
    <section className="inbody-fixed-column inbody-fixed-composition"><h2>2. 체성분</h2>{composition.map(field => <FixedField key={field.label} field={field} />)}</section>
    <section className="inbody-fixed-column inbody-fixed-muscle"><h2>3. 부위별 근육량</h2>{muscle.map(field => <FixedField key={field.label} field={field} />)}</section>
    <section className="inbody-fixed-column inbody-fixed-fat"><h2>4. 부위별 체지방량</h2>{fat.map(field => <FixedField key={field.label} field={field} />)}</section>
    <button className="inbody-fixed-confirm" type="button" onClick={onConfirm}>확인 완료</button><button className="inbody-fixed-previous" type="button" onClick={onPrevious}><img src={previousArrow} alt="" />이전 단계</button>
  </div></FixedStepFrame>
}
