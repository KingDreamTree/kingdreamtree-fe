import inbodyPreviousArrow from '../assets/inbody-previous-arrow.svg'

type PreviousButtonProps = { onClick: () => void; className?: string }

export function PreviousButton({ onClick, className = '' }: PreviousButtonProps) {
  return <button className={`previous-button ${className}`.trim()} type="button" onClick={onClick}>
    <img src={inbodyPreviousArrow} alt="" />
    <span>이전 단계</span>
  </button>
}
