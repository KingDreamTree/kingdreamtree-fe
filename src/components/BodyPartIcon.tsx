import partArm from '../assets/part-arm.png'
import partLeg from '../assets/part-leg.png'
import partTorso from '../assets/part-torso.png'

/**
 * 진단 결과 카드의 부위 아이콘.
 *
 * ⚠️ 종전에는 **팔 그림 하나를 돌려서** 전 부위에 썼다 (App.css 의
 *    `--leg { transform: rotate(180deg) }`). 그래서 "왼쪽 종아리"에 손가락이
 *    달려 있었다. 지금은 팔·다리·몸통 세 장을 부위에 맞게 골라 쓴다.
 *
 * ⚠️ 상완과 전완, 허벅지와 종아리는 **같은 그림**이다 (팔은 팔, 다리는 다리).
 *    마디까지 구분하려면 그림이 더 필요하다 — 그 전까지는 부위 이름이 구분을 맡는다.
 */

const PART_ICONS = { arm: partArm, leg: partLeg, torso: partTorso } as const

/** class_name → 어떤 그림을 쓸지. 모르는 이름은 몸통으로 둔다(빈 자리보다 낫다). */
function pickIcon(className: string | undefined): keyof typeof PART_ICONS {
  const value = (className ?? '').toLowerCase()
  if (value.includes('arm') || value.includes('shoulder') || value.includes('wrist')) return 'arm'
  if (value.includes('leg') || value.includes('thigh') || value.includes('calf') || value.includes('knee')) return 'leg'
  return 'torso'
}

/** 화면에 보이는 방향 기준 오른쪽 부위면 가로로 뒤집는다 — 몸은 좌우 대칭이라 그림은 한 장이면 된다. */
function isRightSide(className: string | undefined): boolean {
  return (className ?? '').toLowerCase().startsWith('right_')
}

type BodyPartIconProps = { partClassName: string | undefined; className?: string; label: string }

export function BodyPartIcon({ partClassName, className = '', label }: BodyPartIconProps) {
  return <img
    className={className}
    src={PART_ICONS[pickIcon(partClassName)]}
    alt={label}
    style={isRightSide(partClassName) ? { transform: 'scaleX(-1)' } : undefined}
  />
}
