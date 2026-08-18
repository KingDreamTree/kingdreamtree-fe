/**
 * 진단 결과 카드의 부위 아이콘.
 *
 * ⚠️ 종전에는 **팔 아이콘 하나를 돌려서** 전 부위에 썼다 (App.css 의
 *    `--leg { transform: rotate(180deg) }`). 그래서 "왼쪽 종아리"에 손가락이
 *    달려 있었고, 상완과 전완이 똑같이 보였다.
 *
 * 상완/전완, 허벅지/종아리는 **같은 팔다리의 다른 마디**다. 그래서 팔(다리)
 * 전체를 흐리게 깔고 해당 마디만 밝게 칠한다 — 모양이 아니라 **위치**로
 * 구분되므로 두 마디를 헷갈릴 수가 없다.
 *
 * ⚠️ 좌우는 그림을 따로 그리지 않고 가로로 뒤집는다. 사람 몸은 좌우 대칭이라
 *    두 벌로 관리하면 한쪽만 고치는 실수가 난다.
 */

type BodyPartIconVariant = 'torso' | 'upper-arm' | 'lower-arm' | 'upper-leg' | 'lower-leg'

/** class_name → 아이콘 종류. 모르는 이름은 몸통으로 둔다(빈 자리보다 낫다). */
function iconVariant(className: string | undefined): BodyPartIconVariant {
  const value = (className ?? '').toLowerCase()
  if (value.includes('upper_arm') || value.includes('shoulder')) return 'upper-arm'
  if (value.includes('lower_arm') || value.includes('forearm') || value.includes('wrist')) return 'lower-arm'
  if (value.includes('upper_leg') || value.includes('thigh')) return 'upper-leg'
  if (value.includes('lower_leg') || value.includes('calf') || value.includes('shin')) return 'lower-leg'
  return 'torso'
}

/** 화면에 보이는 방향 기준 오른쪽 부위인가 — 아이콘을 가로로 뒤집는다. */
function isRightSide(className: string | undefined): boolean {
  return (className ?? '').toLowerCase().startsWith('right_')
}

/** 강조하지 않는 마디의 진하기. 형태는 보이되 초점은 뺏지 않는 값.
 *  ⚠️ 너무 낮추면 팔다리 전체 실루엣이 사라져서 밝은 마디가 그냥 알약처럼 보인다. */
const MUTED = 0.34

/**
 * 팔·다리는 **끊기지 않는 한 덩어리**로 그린다. 마디를 따로 떼어 그리면
 * 사람 팔다리가 아니라 알약 두 개로 읽힌다. 손·발까지 이어 붙여야 어느 쪽이
 * 팔이고 어느 쪽이 다리인지 한눈에 갈린다.
 */
function Limb({ variant }: { variant: Exclude<BodyPartIconVariant, 'torso'> }) {
  const isArm = variant === 'upper-arm' || variant === 'lower-arm'
  const upper = variant === 'upper-arm' || variant === 'upper-leg'
  const hi = { opacity: 1 }
  const lo = { opacity: MUTED }
  return isArm
    ? <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        {/* 위팔 — 어깨에서 팔꿈치 */}
        <path d="M25 14 L31 33" strokeWidth="14" {...(upper ? hi : lo)} />
        {/* 아래팔 + 손 — 팔꿈치에서 손끝까지 이어 그린다 */}
        <path d="M31 33 L36 49" strokeWidth="11" {...(upper ? lo : hi)} />
        <path d="M36 50 L38 56" strokeWidth="12" {...(upper ? lo : hi)} />
      </g>
    : <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        {/* 허벅지 — 골반에서 무릎. 팔보다 굵어야 다리로 읽힌다 */}
        <path d="M26 13 L31 33" strokeWidth="18" {...(upper ? hi : lo)} />
        {/* 종아리 → 발목 → 발등. ㄴ 자로 꺾어야 발로 보인다 */}
        <path d="M31 33 L34 50 L34 55 L45 55" strokeWidth="12" {...(upper ? lo : hi)} />
      </g>
}

/** partClassName: 백엔드 부위 코드(Left_Upper_Arm 등). 종류·좌우를 여기서 판단한다 —
 *  호출부가 매번 두 값을 계산해 넘기면 한 곳만 빠뜨렸을 때 아이콘이 조용히 어긋난다. */
type BodyPartIconProps = { partClassName: string | undefined; className?: string; label: string }

export function BodyPartIcon({ partClassName, className = '', label }: BodyPartIconProps) {
  const variant = iconVariant(partClassName)
  return <svg className={className} viewBox="0 0 64 64" role="img" aria-label={label}
    style={isRightSide(partClassName) ? { transform: 'scaleX(-1)' } : undefined}>
    {variant === 'torso'
      ? <g fill="currentColor">
          {/* 어깨 → 허리 → 골반. ⚠️ 목을 붙이면 보온병처럼 보인다 — 몸통만 그린다.
              넓은 어깨와 잘록한 허리가 있어야 «몸통»으로 읽힌다. */}
          <path d="M17 22c0-5 6-8 15-8s15 3 15 8l-4 13c-1 4-1 8 0 12l1 8c0 2-2 3-4 3H24c-2 0-4-1-4-3l1-8c1-4 1-8 0-12Z" />
        </g>
      : <Limb variant={variant} />}
  </svg>
}
