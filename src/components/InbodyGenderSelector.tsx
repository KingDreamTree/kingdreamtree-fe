import { useState } from 'react'

type InbodyGenderSelectorProps = { className: string }

/** Interactive gender selector shared by the Step 3 InBody forms. */
export function InbodyGenderSelector({ className }: InbodyGenderSelectorProps) {
  const [gender, setGender] = useState<'남' | '여'>('남')

  return <div className={className} role="group" aria-label="성별">
    {(['남', '여'] as const).map(option => <button key={option} type="button" className={gender === option ? 'is-selected' : ''} aria-pressed={gender === option} onClick={() => setGender(option)}>{option}</button>)}
  </div>
}
