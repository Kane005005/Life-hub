import { useState } from 'react'
import { useFx } from '../features/fx/useFx'
import { ApiError } from '../lib/api'
import { SKILL_STATE_LABELS } from '../lib/labels'
import { useUnlockSkill } from '../lib/queries'
import type { SkillNode } from '../lib/types'
import { Button } from './Button'
import { HudFrame } from './HudFrame'

type SkillDetailProps = {
  node: SkillNode | null
}

export function SkillDetail({ node }: SkillDetailProps) {
  const unlock = useUnlockSkill()
  const { announce, burst } = useFx()
  const [error, setError] = useState('')

  if (!node) {
    return (
      <HudFrame className="lr-skill-detail">
        <p className="lr-note">Choisis une compétence pour voir ses détails.</p>
      </HudFrame>
    )
  }

  const canUnlock = node.state === 'UNLOCKABLE'
  const points = node.cost > 1 ? 'points' : 'point'

  async function handleUnlock() {
    if (!node) return
    setError('')
    try {
      const result = await unlock.mutateAsync(node.code)
      announce(result.message)
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        burst(window.innerWidth / 2, window.innerHeight / 2, 18)
      }
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.detail : 'Déblocage impossible.')
    }
  }

  return (
    <HudFrame className="lr-skill-detail" aria-live="polite">
      <p className="lr-detail-code">{SKILL_STATE_LABELS[node.state]}</p>
      <h3 className="lr-form-title">{node.name}</h3>
      <p className="lr-note">Niveau {node.tier}</p>
      <p className="lr-note">
        Coût : <span className="num">{node.cost}</span> {points}
      </p>
      <div>
        <p className="lr-detail-subtitle">Prérequis</p>
        {(node.requires ?? []).length > 0 ? (
          <ul className="lr-detail-quests">
            {(node.requires ?? []).map((req) => (
              <li key={req}>{req}</li>
            ))}
          </ul>
        ) : (
          <p className="lr-note">Aucun prérequis.</p>
        )}
      </div>
      <div>
        <p className="lr-detail-subtitle">Ce qu'il manque</p>
        {(node.missing ?? []).length > 0 ? (
          <ul className="lr-detail-quests">
            {(node.missing ?? []).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          <p className="lr-note">Tout est prêt.</p>
        )}
      </div>
      {error ? (
        <p role="alert" className="lr-field-error">
          {error}
        </p>
      ) : null}
      <Button
        variant="solid"
        disabled={!canUnlock || unlock.isPending}
        onClick={() => void handleUnlock()}
      >
        Débloquer ({node.cost} {points})
      </Button>
    </HudFrame>
  )
}
