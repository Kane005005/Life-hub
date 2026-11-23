import { HudFrame } from './HudFrame'

type SkillPointsBadgeProps = {
  available: number
  spent: number
}

export function SkillPointsBadge({ available, spent }: SkillPointsBadgeProps) {
  return (
    <HudFrame className="lr-skill-points">
      <p className="lr-skill-points-label">Points de compétence</p>
      <p className="lr-skill-points-values">
        <span>
          <span className="num">{available}</span> disponibles
        </span>
        <span>
          <span className="num">{spent}</span> dépensés
        </span>
      </p>
    </HudFrame>
  )
}
