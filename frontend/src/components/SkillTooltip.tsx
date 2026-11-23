import { SKILL_STATE_LABELS } from '../lib/labels'
import type { SkillNode } from '../lib/types'

type SkillTooltipProps = {
  id: string
  node: SkillNode
  requirementNames: string[]
  left: number
  top: number
  side: 'left' | 'right' | 'above'
}

function formatUnlockedAt(value: string | null): string {
  if (!value) {
    return 'date inconnue'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'date inconnue'
  }
  return date.toLocaleDateString('fr-FR')
}

export function SkillTooltip({ id, node, requirementNames, left, top, side }: SkillTooltipProps) {
  const points = node.cost > 1 ? 'points' : 'point'
  const missing = node.missing ?? []
  const className =
    side === 'left'
      ? 'lr-skill-tooltip lr-skill-tooltip--left'
      : side === 'right'
        ? 'lr-skill-tooltip lr-skill-tooltip--right'
        : 'lr-skill-tooltip lr-skill-tooltip--above'

  return (
    <div id={id} role="tooltip" className={className} style={{ left: `${left}%`, top: `${top}%` }}>
      <p className="lr-skill-tooltip-name">{node.name}</p>
      <p className="lr-skill-tooltip-meta">
        Niveau {node.tier} · {SKILL_STATE_LABELS[node.state].toLowerCase()} · {node.cost} {points}
      </p>
      <p className="lr-skill-tooltip-label">Prérequis</p>
      {requirementNames.length > 0 ? (
        <p className="lr-skill-tooltip-value">{requirementNames.join(', ')}</p>
      ) : (
        <p className="lr-skill-tooltip-value">Aucun prérequis.</p>
      )}
      <p className="lr-skill-tooltip-label">Ce qu'il manque</p>
      <p className="lr-skill-tooltip-value">
        {node.state === 'UNLOCKED'
          ? `Acquise le ${formatUnlockedAt(node.unlocked_at)}.`
          : missing.length > 0
            ? missing.join(' · ')
            : 'Tout est prêt.'}
      </p>
    </div>
  )
}
