import { useState } from 'react'
import inbodyCalendar from '../assets/inbody-calendar.svg'
import inbodyErrorLineOne from '../assets/inbody-error-line-one.svg'
import inbodyErrorLineTwo from '../assets/inbody-error-line-two.svg'
import inbodyErrorLock from '../assets/inbody-error-lock.svg'
import inbodyPreviousArrow from '../assets/inbody-previous-arrow.svg'
import inbodyRequiredDot from '../assets/inbody-required-dot.svg'
import { InbodyGenderSelector } from '../components/InbodyGenderSelector'
import { FixedStepFrame } from '../components/FixedStepFrame'

type Field = { label: string; value: string; unit?: string }

const composition: Field[] = [{ label: '체중', value: '68.7', unit: 'kg' }, { label: 'BMI', value: '23.2', unit: 'kg/m²' }, { label: '골격근량', value: '28.4', unit: 'kg' }, { label: '체지방률', value: '22.7', unit: '%' }, { label: '체지방량', value: '15.6', unit: 'kg' }, { label: '기초대사량', value: '1524', unit: 'kcal' }]
const muscle: Field[] = [{ label: '오른팔', value: '2.65' }, { label: '왼팔', value: '2.55' }, { label: '몸통', value: '2.13' }, { label: '오른다리', value: '8.35' }, { label: '왼다리', value: '8.25' }]
const fat: Field[] = [{ label: '오른팔', value: '0.8' }, { label: '왼팔', value: '0.8' }, { label: '몸통', value: '0.8' }, { label: '오른다리', value: '0.8' }, { label: '왼다리', value: '0.8' }]

function ErrorGlyph({ compact = false }: { compact?: boolean }) {
  return <span className={`inbody-range-error-glyph ${compact ? 'is-compact' : ''}`} aria-hidden="true"><img src={inbodyErrorLineOne} alt="" /><img src={inbodyErrorLineTwo} alt="" /></span>
}

function RangeField({ field, invalid = false, onCorrect }: { field: Field; invalid?: boolean; onCorrect?: () => void }) {
  return <label className={`inbody-range-field ${invalid ? 'is-invalid' : ''}`}><span>{field.label}{field.unit && <small>({field.unit})</small>}{invalid && <em>허용범위: 25~250</em>}</span><div><input aria-label={field.label} defaultValue={field.value} onChange={invalid ? onCorrect : undefined} />{invalid && <ErrorGlyph compact />}</div></label>
}

type InbodyRangeErrorScreenProps = { onConfirm: () => void; onPrevious: () => void }

export function InbodyRangeErrorScreen({ onConfirm, onPrevious }: InbodyRangeErrorScreenProps) {
  const [isCorrected, setIsCorrected] = useState(false)

  return <FixedStepFrame label="인바디-입력범위오류"><div className="inbody-range-page">
    <p className="step-label">Step 3/3</p><h1>인바디 정보 입력</h1><p className="step-description">AI가 인식한 결과입니다. 틀린 부분이 있다면 터치하여 수정해 주세요.</p>
    <section className="inbody-range-guide" role="alert"><ErrorGlyph /><div><strong>저장에 실패했습니다.</strong><p>입력한 값이 허용 범위를 벗어났습니다. 값을 확인하고 다시 시도해주세요.</p></div></section>
    <section className="inbody-range-smi"><span>SMI <small>(kg/m²)</small></span><strong>8.25</strong><small>* 골격근량 ÷ 신장²</small></section>
    <section className="inbody-range-basic"><h2>1. 기본 정보</h2><RangeField field={{ label: '신장', value: '172', unit: 'cm' }} /><RangeField field={{ label: '나이', value: '33', unit: '세' }} /><label className="inbody-range-field"><span>성별</span><InbodyGenderSelector className="inbody-range-gender" /></label><label className="inbody-range-field"><span>측정일</span><div className="inbody-range-date"><input aria-label="측정일" defaultValue="2025-08-12" /><img src={inbodyCalendar} alt="달력" /></div></label></section>
    <section className="inbody-range-column inbody-range-composition"><h2>2. 체성분</h2>{composition.map((field, index) => <RangeField key={field.label} field={field} invalid={index === 0} onCorrect={() => setIsCorrected(true)} />)}</section>
    <section className="inbody-range-column inbody-range-muscle"><h2>3. 부위별 근육량</h2>{muscle.map(field => <RangeField key={field.label} field={field} />)}</section>
    <section className="inbody-range-column inbody-range-fat"><h2>4. 부위별 체지방량</h2>{fat.map(field => <RangeField key={field.label} field={field} />)}</section>
    <button className="inbody-range-confirm" type="button" disabled={!isCorrected} onClick={onConfirm}>{!isCorrected && <img src={inbodyErrorLock} alt="" />}확인 완료</button><button className="inbody-range-previous" type="button" onClick={onPrevious}><img src={inbodyPreviousArrow} alt="" />이전 단계</button><p className="inbody-range-note">* 오류가 있는 경우 지정할 수 없습니다.</p><img className="inbody-range-required" src={inbodyRequiredDot} alt="필수" />
  </div></FixedStepFrame>
}
