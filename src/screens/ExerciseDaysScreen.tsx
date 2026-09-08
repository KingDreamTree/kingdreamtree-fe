import { useState } from 'react'
import exerciseDaysArrow from '../assets/exercise-days-arrow.svg'
import { FixedStepFrame } from '../components/FixedStepFrame'
import { PreviousButton } from '../components/PreviousButton'

/** Figma 618:3197 — 운동일수 */
export function ExerciseDaysScreen({ days, onDaysChange, onNext, onPrevious }: { days: number; onDaysChange: (days: number) => void; onNext: () => void; onPrevious: () => void }) {
  const [isOpen, setIsOpen] = useState(false)

  const selectDays = (day: number) => {
    onDaysChange(day)
    setIsOpen(false)
  }

  return <FixedStepFrame label="운동일수"><div className="exercise-days-page">
    <p className="exercise-days-page__eyebrow">루틴 제공을 위한 마지막 단계에요</p>
    <h1>운동 가능 일수</h1><PreviousButton onClick={onPrevious} />
    <p className="exercise-days-page__question"><em>1주일동안</em> 운동 가능한 일수를 알려주세요.</p>
    <div className={`exercise-days-page__select ${isOpen ? 'is-open' : ''}`}>
      <button type="button" aria-haspopup="listbox" aria-expanded={isOpen} onClick={() => setIsOpen(open => !open)}>{days}<img src={exerciseDaysArrow} alt="" /></button>
      {isOpen && <div className="exercise-days-page__options" role="listbox" aria-label="일주일 운동 가능 일수">{[1, 2, 3, 4, 5, 6, 7].map(day => <button aria-selected={days === day} className={days === day ? 'is-selected' : ''} type="button" role="option" key={day} onClick={() => selectDays(day)}>{day}</button>)}</div>}
    </div>
    <button className="exercise-days-page__next" type="button" onClick={onNext}>다음 단계</button>
  </div></FixedStepFrame>
}
