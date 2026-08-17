import { useState } from 'react'

type InbodyGenderSelectorProps = {
  className: string
  /** 넘기면 제어 컴포넌트로 동작한다 (인바디 확인 폼). 없으면 내부 상태. */
  value?: '남' | '여'
  onChange?: (gender: '남' | '여') => void
}

/** Interactive gender selector shared by the Step 3 InBody forms. */
export function InbodyGenderSelector({ className, value, onChange }: InbodyGenderSelectorProps) {
  const [internal, setInternal] = useState<'남' | '여'>('남')
  const gender = value ?? internal
  const select = (option: '남' | '여') => {
    setInternal(option)
    onChange?.(option)
  }

  return <div className={className} role="group" aria-label="성별">
    {(['남', '여'] as const).map(option => <button key={option} type="button" className={gender === option ? 'is-selected' : ''} aria-pressed={gender === option} onClick={() => select(option)}>{option}</button>)}
  </div>
}
