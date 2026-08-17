import { useMemo, useState } from 'react'
import inbodyCalendar from '../assets/inbody-calendar.svg'
import inbodyPreviousArrow from '../assets/inbody-previous-arrow.svg'
import inbodyRequiredDot from '../assets/inbody-required-dot.svg'
import { InbodyGenderSelector } from '../components/InbodyGenderSelector'
import { FixedStepFrame } from '../components/FixedStepFrame'
import type { InbodyDetail, InbodySegmentDto, InbodySegmentKey } from '../lib/api'

export type InbodyPatch = { fields: Record<string, unknown>; segments: InbodySegmentDto[] }

type InbodyUploadAfterScreenProps = {
  inbody: InbodyDetail | null
  onConfirm: (patch: InbodyPatch) => void
  onPrevious: () => void
}

/** inbody.fields 컬럼명 ↔ 화면 입력 정의. 값이 없으면 빈 칸으로 두고 사용자가 채운다. */
const COMPOSITION_FIELDS: Array<{ key: string; label: string; unit?: string }> = [
  { key: 'weight', label: '체중', unit: 'kg' },
  { key: 'bmi', label: 'BMI', unit: 'kg/m²' },
  { key: 'skeletal_muscle_mass', label: '골격근량', unit: 'kg' },
  { key: 'body_fat_percentage', label: '체지방률', unit: '%' },
  { key: 'body_fat_mass', label: '체지방량', unit: 'kg' },
  // ⚠️ 백엔드 컬럼명은 bmr_kcal 이다 (inbody.fields / PATCH 허용 목록 공통).
  //    basal_metabolic_rate 로 보내면 PATCH 전체가 400으로 반려된다.
  { key: 'bmr_kcal', label: '기초대사량', unit: 'kcal' },
]

const SEGMENT_ORDER: Array<{ key: InbodySegmentKey; label: string }> = [
  { key: 'RIGHT_ARM', label: '오른팔' },
  { key: 'LEFT_ARM', label: '왼팔' },
  { key: 'TRUNK', label: '몸통' },
  { key: 'RIGHT_LEG', label: '오른다리' },
  { key: 'LEFT_LEG', label: '왼다리' },
]

const asText = (value: unknown) => (value === null || value === undefined ? '' : String(value))
const asNumberOrNull = (text: string) => {
  const trimmed = text.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

export function InbodyUploadAfterScreen({ inbody, onConfirm, onPrevious }: InbodyUploadAfterScreenProps) {
  const initialFields = useMemo(() => {
    const source = inbody?.fields ?? {}
    const out: Record<string, string> = {}
    for (const { key } of COMPOSITION_FIELDS) out[key] = asText(source[key])
    out.height = asText(source.height)
    out.age = asText(source.age)
    out.measured_at = asText(inbody?.measured_at)
    return out
  }, [inbody])

  const initialSegments = useMemo(() => {
    const bySegment = new Map(inbody?.segments?.map(seg => [seg.segment, seg]) ?? [])
    const lean: Record<string, string> = {}
    const fat: Record<string, string> = {}
    for (const { key } of SEGMENT_ORDER) {
      lean[key] = asText(bySegment.get(key)?.lean_mass)
      fat[key] = asText(bySegment.get(key)?.fat_mass)
    }
    return { lean, fat }
  }, [inbody])

  const [fields, setFields] = useState(initialFields)
  const [gender, setGender] = useState<'남' | '여'>(asText(inbody?.fields?.gender) === 'FEMALE' || asText(inbody?.fields?.gender) === '여' ? '여' : '남')
  const [lean, setLean] = useState(initialSegments.lean)
  const [fat, setFat] = useState(initialSegments.fat)

  const setField = (key: string, value: string) => setFields(prev => ({ ...prev, [key]: value }))
  const warnings = inbody?.validation ?? {}

  const submit = () => {
    const patchFields: Record<string, unknown> = { gender: gender === '여' ? 'FEMALE' : 'MALE' }
    for (const { key } of COMPOSITION_FIELDS) patchFields[key] = asNumberOrNull(fields[key])
    patchFields.height = asNumberOrNull(fields.height)
    patchFields.age = asNumberOrNull(fields.age)
    if (fields.measured_at.trim()) patchFields.measured_at = fields.measured_at.trim()
    const segments: InbodySegmentDto[] = SEGMENT_ORDER.map(({ key }) => ({
      segment: key,
      lean_mass: asNumberOrNull(lean[key]),
      fat_mass: asNumberOrNull(fat[key]),
    }))
    onConfirm({ fields: patchFields, segments })
  }

  const renderInput = (key: string, label: string, unit?: string, required?: boolean) => {
    const warning = warnings[key]
    return <label className={`inbody-after-field ${warning ? 'has-warning' : ''}`} key={key} title={warning?.message}>
      <span>{label}{unit && <small>({unit})</small>}{required && <img src={inbodyRequiredDot} alt="필수" />}</span>
      <input aria-label={label} value={fields[key] ?? ''} onChange={event => setField(key, event.target.value)} />
      {warning && <em className="inbody-after-warning">{warning.message}</em>}
    </label>
  }

  return <FixedStepFrame label="인바디-업로드 후"><div className="inbody-after-page">
    <p className="step-label">Step 3/3</p><h1>인바디 정보 입력</h1><p className="step-description">AI가 인식한 결과입니다. 틀린 부분이 있다면 터치하여 수정해 주세요.</p>
    <section className="inbody-after-smi"><span>SMI <small>(kg/m²)</small></span><strong>{inbody?.smi ?? '—'}</strong><small>* 골격근량 ÷ 신장² (서버 계산)</small></section>
    <section className="inbody-after-basic"><h2>1. 기본 정보</h2>
      {renderInput('height', '신장', 'cm', true)}
      {renderInput('age', '나이', '세')}
      <label className="inbody-after-field"><span>성별</span><InbodyGenderSelector className="inbody-after-gender" value={gender} onChange={setGender} /></label>
      <label className="inbody-after-field"><span>측정일</span><div className="inbody-after-date"><input aria-label="측정일" value={fields.measured_at ?? ''} onChange={event => setField('measured_at', event.target.value)} placeholder="YYYY-MM-DD" /><img src={inbodyCalendar} alt="달력" /></div></label>
    </section>
    <section className="inbody-after-column inbody-after-composition"><h2>2. 체성분</h2>{COMPOSITION_FIELDS.map(field => renderInput(field.key, field.label, field.unit))}</section>
    <section className="inbody-after-column inbody-after-muscle"><h2>3. 부위별 근육량</h2>{SEGMENT_ORDER.map(({ key, label }) => <label className="inbody-after-field" key={`lean-${key}`}><span>{label}</span><input aria-label={`${label} 근육량`} value={lean[key] ?? ''} onChange={event => setLean(prev => ({ ...prev, [key]: event.target.value }))} /></label>)}</section>
    <section className="inbody-after-column inbody-after-fat"><h2>4. 부위별 체지방량</h2>{SEGMENT_ORDER.map(({ key, label }) => <label className="inbody-after-field" key={`fat-${key}`}><span>{label}</span><input aria-label={`${label} 체지방량`} value={fat[key] ?? ''} onChange={event => setFat(prev => ({ ...prev, [key]: event.target.value }))} /></label>)}</section>
    <button className="inbody-after-confirm" type="button" onClick={submit}>확인 완료</button><button className="inbody-after-previous" type="button" onClick={onPrevious}><img src={inbodyPreviousArrow} alt="" />이전 단계</button><p className="inbody-after-note">* 이 값으로 진행 및 확인 기록이 저장됩니다.</p>
  </div></FixedStepFrame>
}
