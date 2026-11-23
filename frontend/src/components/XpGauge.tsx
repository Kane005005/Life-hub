import { prefersReducedMotion } from '../features/fx/motion'

type XpGaugeProps = {
  level: number
  xp: number
  xpRequired: number
  variant?: 'full' | 'mini'
  pulse?: boolean
}

export function XpGauge({ level, xp, xpRequired, variant = 'full', pulse = false }: XpGaugeProps) {
  const percent = xpRequired > 0 ? Math.min(100, (xp / xpRequired) * 100) : 0
  const classes = [
    'lr-gauge',
    variant === 'mini' ? 'lr-gauge--mini' : undefined,
    pulse && !prefersReducedMotion() ? 'lr-gauge--pulse' : undefined,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes}>
      {variant === 'full' ? (
        <div className="lr-g-head">
          <span className="lr-g-head-level">Niveau {level}</span>
          <span className="lr-g-head-xp num">
            {xp} / {xpRequired} XP
          </span>
        </div>
      ) : null}
      <div
        className="lr-rail"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={xpRequired}
        aria-valuenow={xp}
        aria-label={`Niveau ${level}, ${xp} sur ${xpRequired} XP`}
      >
        <span className="lr-fill" style={{ width: `${percent}%` }}>
          <span className="lr-fill-inner" style={{ transform: `scaleX(${percent / 100})` }} />
        </span>
      </div>
    </div>
  )
}
