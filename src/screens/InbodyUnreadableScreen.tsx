import inbodyCalendar from '../assets/inbody-calendar.svg'
import inbodyUnreadableInfo from '../assets/inbody-unreadable-info.svg'
import previousArrow from '../assets/previous-arrow.svg'
import inbodyRequiredDot from '../assets/inbody-required-dot.svg'
import { InbodyGenderSelector } from '../components/InbodyGenderSelector'
import { FixedStepFrame } from '../components/FixedStepFrame'

type Field = { label: string; unit?: string }
const composition: Field[] = [{ label: '체중', unit: 'kg' }, { label: 'BMI', unit: 'kg/m²' }, { label: '골격근량', unit: 'kg' }, { label: '체지방률', unit: '%' }, { label: '체지방량', unit: 'kg' }, { label: '기초대사량', unit: 'kcal' }]
const muscle = ['오른팔', '왼팔', '몸통', '오른다리', '왼다리']
const fat = ['오른팔', '왼팔', '몸통', '오른다리', '왼다리']

function EmptyField({ field, placeholder = '' }: { field: Field; placeholder?: string }) {
  return <label className="inbody-unreadable-field"><span>{field.label}{field.unit && <small>({field.unit})</small>}</span><input aria-label={field.label} placeholder={placeholder} /></label>
}

type InbodyUnreadableScreenProps = { onConfirm: () => void; onPrevious: () => void }

export function InbodyUnreadableScreen({ onConfirm, onPrevious }: InbodyUnreadableScreenProps) {
  return <FixedStepFrame label="인바디-결과지 읽지 못함"><div className="inbody-unreadable-page">
    <p className="step-label">Step 3/3</p><h1>인바디 정보 입력</h1><p className="step-description">현재 값으로 비교 분석이 진행되니 틀린 부분이 있으면 수정해 주세요.</p>
    <section className="inbody-unreadable-guide" role="status"><span><img src={inbodyUnreadableInfo} alt="" /></span><div><strong>결과지를 읽지 못했어요.</strong><p>직접 입력한 뒤 확인 완료를 눌러주세요.</p></div></section>
    <section className="inbody-unreadable-smi"><span>SMI <small>(kg/m²)</small></span><strong>8.25</strong><small>* 골격근량 ÷ 신장²</small></section>
    <section className="inbody-unreadable-basic"><h2>1. 기본 정보</h2><label className="inbody-unreadable-field"><span>신장 <small>(cm)</small><img src={inbodyRequiredDot} alt="필수" /></span><input aria-label="신장" placeholder="입력해주세요." /></label><EmptyField field={{ label: '나이', unit: '세' }} placeholder="선택 입력" /><label className="inbody-unreadable-field"><span>성별</span><InbodyGenderSelector className="inbody-unreadable-gender" /></label><label className="inbody-unreadable-field"><span>측정일</span><div className="inbody-unreadable-date"><input aria-label="측정일" placeholder="YYYY-MM-DD" /><img src={inbodyCalendar} alt="달력" /></div></label></section>
    <section className="inbody-unreadable-column inbody-unreadable-composition"><h2>2. 체성분</h2>{composition.map(field => <EmptyField key={field.label} field={field} />)}</section>
    <section className="inbody-unreadable-column inbody-unreadable-muscle"><h2>3. 부위별 근육량</h2>{muscle.map(label => <EmptyField key={label} field={{ label, unit: 'kg' }} />)}</section>
    <section className="inbody-unreadable-column inbody-unreadable-fat"><h2>4. 부위별 체지방량</h2>{fat.map(label => <EmptyField key={label} field={{ label, unit: 'kg' }} />)}</section>
    <button className="inbody-unreadable-confirm" type="button" onClick={onConfirm}>확인 완료</button><button className="inbody-unreadable-previous" type="button" onClick={onPrevious}><img src={previousArrow} alt="" />이전 단계</button><p className="inbody-unreadable-note">* 이 값으로 진행 및 확인 기록이 저장됩니다.</p>
  </div></FixedStepFrame>
}
