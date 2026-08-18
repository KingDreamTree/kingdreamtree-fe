import previousArrow from '../assets/previous-arrow.svg'

type PreviousButtonProps = { onClick: () => void; className?: string }

export function PreviousButton({ onClick, className = '' }: PreviousButtonProps) {
  return <button className={`previous-button ${className}`.trim()} type="button" onClick={onClick}>
    <img src={previousArrow} alt="" />
    <span>이전 단계</span>
  </button>
}
