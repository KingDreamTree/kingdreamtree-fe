import { useEffect, useMemo, useRef, useState } from 'react'
import inbodyCalendar from '../assets/inbody-calendar.svg'

/** 한 칸 높이(px). 스크롤 위치 ↔ 선택 값 계산이 전부 이 값을 기준으로 돈다. */
const ITEM_HEIGHT = 36
// 보이는 칸 수는 5(홀수) — 가운데 한 칸이 선택 자리다. 목록 높이 180px 과
// 위아래 여백 72px((5-1)/2 × 36) 이 App.css 에 같은 전제로 잡혀 있다.

const pad2 = (value: number) => String(value).padStart(2, '0')
const daysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate()

type WheelProps = { label: string; values: number[]; selected: number; unit: string; onSelect: (value: number) => void }

/** 세로로 굴리는 한 줄. 스크롤이 멎으면 가운데 칸이 선택된다. */
function Wheel({ label, values, selected, unit, onSelect }: WheelProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const settleTimer = useRef(0)
  /** 코드가 스크롤을 옮기는 동안에는 onScroll 을 무시한다 — 안 그러면 선택이 되돌아온다. */
  const isAdjusting = useRef(false)

  useEffect(() => {
    const list = listRef.current
    const index = values.indexOf(selected)
    if (!list || index < 0) return
    isAdjusting.current = true
    list.scrollTop = index * ITEM_HEIGHT
    const timer = window.setTimeout(() => { isAdjusting.current = false }, 150)
    return () => window.clearTimeout(timer)
  }, [selected, values])

  const handleScroll = () => {
    if (isAdjusting.current) return
    window.clearTimeout(settleTimer.current)
    settleTimer.current = window.setTimeout(() => {
      const list = listRef.current
      if (!list) return
      const index = Math.min(values.length - 1, Math.max(0, Math.round(list.scrollTop / ITEM_HEIGHT)))
      if (values[index] !== selected) onSelect(values[index])
    }, 130)
  }

  useEffect(() => () => window.clearTimeout(settleTimer.current), [])

  return <div className="date-wheel" role="listbox" aria-label={label}>
    <div className="date-wheel__list" ref={listRef} onScroll={handleScroll}>
      {values.map(value => <button
        type="button" key={value} role="option" aria-selected={value === selected}
        className={value === selected ? 'is-selected' : ''}
        onClick={() => onSelect(value)}
      >{value}{unit}</button>)}
    </div>
  </div>
}

type InbodyDateFieldProps = { value: string; onChange: (next: string) => void }

/** 측정일 입력 — 눌러서 연·월·일을 굴려 고른다 (브라우저 기본 달력 대신). */
export function InbodyDateField({ value, onChange }: InbodyDateFieldProps) {
  const [isOpen, setIsOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const today = new Date()
  const parsed = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  const year = parsed ? Number(parsed[1]) : today.getFullYear()
  const month = parsed ? Number(parsed[2]) : today.getMonth() + 1
  const day = parsed ? Number(parsed[3]) : today.getDate()

  // 인바디 측정일은 과거이므로 올해까지만, 10년 전부터 고를 수 있게 한다.
  const years = useMemo(() => {
    const end = new Date().getFullYear()
    return Array.from({ length: 11 }, (_, index) => end - 10 + index)
  }, [])
  const months = useMemo(() => Array.from({ length: 12 }, (_, index) => index + 1), [])
  const days = useMemo(() => Array.from({ length: daysInMonth(year, month) }, (_, index) => index + 1), [year, month])

  /** 월이 바뀌어 그 달에 없는 날짜가 되면(1/31 → 2월) 마지막 날로 당긴다. */
  const emit = (nextYear: number, nextMonth: number, nextDay: number) => {
    const safeDay = Math.min(nextDay, daysInMonth(nextYear, nextMonth))
    onChange(`${nextYear}-${pad2(nextMonth)}-${pad2(safeDay)}`)
  }

  useEffect(() => {
    if (!isOpen) return
    const handlePointer = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setIsOpen(false)
    }
    const handleKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setIsOpen(false) }
    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [isOpen])

  return <div className="inbody-after-date" ref={rootRef}>
    <button
      type="button" className="inbody-after-date__value"
      aria-haspopup="dialog" aria-expanded={isOpen} aria-label="측정일 선택"
      onClick={() => setIsOpen(open => !open)}
    >{value || 'YYYY-MM-DD'}</button>
    <img src={inbodyCalendar} alt="" />
    {isOpen && <div className="date-picker" role="dialog" aria-label="측정일 선택">
      {/* 가운데 띠가 "지금 고른 값" 자리를 알려준다 */}
      <span className="date-picker__band" aria-hidden="true" />
      <Wheel label="연도" values={years} selected={year} unit="년" onSelect={next => emit(next, month, day)} />
      <Wheel label="월" values={months} selected={month} unit="월" onSelect={next => emit(year, next, day)} />
      <Wheel label="일" values={days} selected={day} unit="일" onSelect={next => emit(year, month, next)} />
    </div>}
  </div>
}
