import { HudFrame } from './HudFrame'

type SkillPointsBadgeProps = {
  available: number
  spent: number
}

export function SkillPointsBadge({ available, spent }: SkillPointsBadgeProps) {
  return (
    <HudFrame className="lr-skill-points lr-skill-points-card">
      <p className="lr-skill-points-label">Points de compétence disponibles</p>
      <div className="lr-skill-points-main">
        <span className="lr-skill-points-number">{available}</span>
        <span className="lr-skill-points-unit">
          {available > 1 ? 'points disponibles' : 'point disponible'}
        </span>
      </div>
      <p className="lr-skill-points-spent">
        <span className="num">{spent}</span> {spent > 1 ? 'dépensés' : 'dépensé'}
      </p>
    </HudFrame>
  )
}
