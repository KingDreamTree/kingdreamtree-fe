import inbodyCalendar from '../assets/inbody-calendar.svg'
import previousArrow from '../assets/previous-arrow.svg'
import inbodyRequiredDot from '../assets/inbody-required-dot.svg'
import inbodyWarningGuideIcon from '../assets/inbody-warning-guide-icon.svg'
import inbodyWarningInputIcon from '../assets/inbody-warning-input-icon.svg'
import { InbodyGenderSelector } from '../components/InbodyGenderSelector'
import { FixedStepFrame } from '../components/FixedStepFrame'

type Field = { label: string; value: string; unit?: string }

const composition: Field[] = [
  { label: '체중', value: '68.7', unit: 'kg' },
  { label: 'BMI', value: '23.2', unit: 'kg/m²' },
  { label: '골격근량', value: '28.4', unit: 'kg' },
  { label: '체지방률', value: '22.7', unit: '%' },
  { label: '체지방량', value: '15.6', unit: 'kg' },
  { label: '기초대사량', value: '1524', unit: 'kcal' },
]
const muscle: Field[] = [{ label: '오른팔', value: '2.65' }, { label: '왼팔', value: '2.55' }, { label: '몸통', value: '2.13' }, { label: '오른다리', value: '8.35' }, { label: '왼다리', value: '8.25' }]
const fat: Field[] = [{ label: '오른팔', value: '0.8' }, { label: '왼팔', value: '0.8' }, { label: '몸통', value: '0.8' }, { label: '오른다리', value: '0.8' }, { label: '왼다리', value: '0.8' }]

function WarningGlyph({ compact = false }: { compact?: boolean }) {
  return <span className={`inbody-warning-glyph ${compact ? 'is-compact' : ''}`} aria-hidden="true"><img src={compact ? inbodyWarningInputIcon : inbodyWarningGuideIcon} alt="" /></span>
}

function WarningField({ field, warning = false, required = false }: { field: Field; warning?: boolean; required?: boolean }) {
  return <label className={`inbody-warning-field ${warning ? 'is-warning' : ''}`}>
    <span>{field.label}{field.unit && <small>({field.unit})</small>}{required && <img src={inbodyRequiredDot} alt="필수" />}</span>
    <div><input aria-label={field.label} defaultValue={field.value} />{warning && <WarningGlyph compact />}</div>
  </label>
}

type InbodyValidationWarningScreenProps = { onConfirm: () => void; onPrevious: () => void }

export function InbodyValidationWarningScreen({ onConfirm, onPrevious }: InbodyValidationWarningScreenProps) {
  const warnedFields = new Set(['체중', 'BMI', '체지방률', '체지방량'])

  return <FixedStepFrame label="인바디-검증경고"><div className="inbody-warning-page">
    <p className="step-label">Step 3/3</p><h1>인바디 정보 입력</h1><p className="step-description">AI가 인식한 결과입니다. 틀린 부분이 있다면 터치하여 수정해 주세요.</p>
    <section className="inbody-warning-guide" role="status"><WarningGlyph /><div><strong>확인이 필요한 항목이 1개 있습니다.</strong><p>아래 항목들을 확인 후, 필요 시 수정해 주세요.</p></div></section>
    <section className="inbody-warning-guide inbody-warning-guide--detail" role="status"><WarningGlyph /><div><strong>체지방률 불일치 - 계산값 33.07 vs 추출값 18.90</strong><p>관련 항목들의 값이 서로 맞지 않습니다. 값을 확인하거나 수정해 주세요.</p></div></section>
    <section className="inbody-warning-smi"><span>SMI <small>(kg/m²)</small></span><strong>8.25</strong><small>* 골격근량 ÷ 신장²</small></section>
    <section className="inbody-warning-basic"><h2>1. 기본 정보</h2><WarningField field={{ label: '신장', value: '172', unit: 'cm' }} required /><WarningField field={{ label: '나이', value: '33', unit: '세' }} /><label className="inbody-warning-field"><span>성별</span><InbodyGenderSelector className="inbody-warning-gender" /></label><label className="inbody-warning-field"><span>측정일</span><div className="inbody-warning-date"><input aria-label="측정일" defaultValue="2025-08-12" /><img src={inbodyCalendar} alt="달력" /></div></label></section>
    <section className="inbody-warning-column inbody-warning-composition"><h2>2. 체성분</h2>{composition.map(field => <WarningField key={field.label} field={field} warning={warnedFields.has(field.label)} />)}</section>
    <section className="inbody-warning-column inbody-warning-muscle"><h2>3. 부위별 근육량</h2>{muscle.map(field => <WarningField key={field.label} field={field} />)}</section>
    <section className="inbody-warning-column inbody-warning-fat"><h2>4. 부위별 체지방량</h2>{fat.map(field => <WarningField key={field.label} field={field} />)}</section>
    <button className="inbody-warning-confirm" type="button" onClick={onConfirm}>확인 완료</button><button className="inbody-warning-previous" type="button" onClick={onPrevious}><img src={previousArrow} alt="" />이전 단계</button><p className="inbody-warning-note">* 이 값으로 진행 및 확인 기록이 저장됩니다.</p>
  </div></FixedStepFrame>
}
