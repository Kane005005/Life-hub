import { CLASS_LABELS } from '../lib/labels'
import type { Character } from '../lib/types'
import { Avatar } from './Avatar'
import { HudFrame } from './HudFrame'
import { XpGauge } from './XpGauge'

type HeroCardProps = {
  character: Character
}

export function HeroCard({ character }: HeroCardProps) {
  return (
    <HudFrame className="lr-card-char">
      <Avatar
        silhouette={character.avatar.silhouette}
        color={character.avatar.color}
        accent={character.avatar.accent}
        label={`Avatar de ${character.pseudonym}`}
      />
      <h4>{character.pseudonym}</h4>
      <p className="lr-card-class">{CLASS_LABELS[character.character_class]}</p>
      <span className="lr-rank">{character.rank.label}</span>
      <div className="lr-card-gauge">
        <XpGauge
          level={character.level}
          xp={character.xp_in_level}
          xpRequired={character.xp_required}
          variant="full"
        />
      </div>
      <dl className="lr-card-stats">
        <div>
          <dt>XP total</dt>
          <dd className="num">{character.total_xp}</dd>
        </div>
        <div>
          <dt>Crédits</dt>
          <dd className="num">{character.credits}</dd>
        </div>
        <div>
          <dt>Points de compétence</dt>
          <dd className="num">{character.skill_points.available}</dd>
        </div>
      </dl>
    </HudFrame>
  )
}
