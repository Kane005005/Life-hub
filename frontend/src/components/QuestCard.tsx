import { useEffect, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { useCelebrate } from '../features/fx/useCelebrate'
import { useFx } from '../features/fx/useFx'
import { ApiError } from '../lib/api'
import type { CssVars } from '../lib/css'
import { formatDate } from '../lib/format'
import {
  DIFFICULTY_LABELS,
  PRIORITY_LABELS,
  QUEST_TYPE_LABELS,
  TERRITORY_BY_CODE,
} from '../lib/labels'
import { useAbandonQuest, useAcceptQuest, useCompleteQuest, useToggleStep } from '../lib/queries'
import type { Quest } from '../lib/types'
import { Button } from './Button'

type QuestCardProps = {
  quest: Quest
}

type Action = {
  label: string
  kind: 'accept' | 'complete'
  disabled: boolean
}

function actionFor(quest: Quest): Action {
  if (quest.status === 'COMPLETED') {
    return { label: 'Validée', kind: 'complete', disabled: true }
  }
  if (quest.status === 'ABANDONED') {
    return { label: 'Abandonnée', kind: 'complete', disabled: true }
  }
  if (quest.completed_this_period) {
    return {
      label: quest.quest_type === 'WEEKLY' ? 'Validée cette semaine' : "Validée aujourd'hui",
      kind: 'complete',
      disabled: true,
    }
  }
  if (quest.status === 'AVAILABLE' || quest.status === 'PAUSED') {
    return { label: 'Accepter', kind: 'accept', disabled: false }
  }
  return {
    label: quest.quest_type === 'BOSS' ? 'Affronter' : 'Valider',
    kind: 'complete',
    disabled: false,
  }
}

export function QuestCard({ quest }: QuestCardProps) {
  const accept = useAcceptQuest()
  const complete = useCompleteQuest()
  const abandon = useAbandonQuest()
  const toggleStep = useToggleStep()
  const celebrate = useCelebrate()
  const { announce, toast } = useFx()
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(false)
  const cancelRef = useRef<HTMLButtonElement>(null)

  const isBoss = quest.quest_type === 'BOSS'
  const action = actionFor(quest)
  const link = TERRITORY_BY_CODE[quest.territory]
  const cardStyle: CssVars = { '--c': link.color }
  const doneSteps = quest.steps.filter((step) => step.is_done).length
  const stepsLocked = quest.status === 'COMPLETED' || quest.status === 'ABANDONED'

  useEffect(() => {
    if (!confirming) {
      return
    }
    cancelRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setConfirming(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [confirming])

  function showError(cause: unknown) {
    const detail = cause instanceof ApiError ? cause.detail : 'Action impossible.'
    setError(detail)
    announce(detail)
  }

  async function handleAction(event: MouseEvent<HTMLButtonElement>) {
    const button = event.currentTarget
    setError('')
    try {
      if (action.kind === 'accept') {
        const updated = await accept.mutateAsync(quest.id)
        const message = `Mission acceptée : ${updated.title}.`
        announce(message)
        toast(message)
        return
      }
      const result = await complete.mutateAsync(quest.id)
      celebrate(result, button)
    } catch (cause) {
      showError(cause)
    }
  }

  async function handleStep(stepId: number) {
    setError('')
    try {
      await toggleStep.mutateAsync({ id: quest.id, stepId })
    } catch (cause) {
      showError(cause)
    }
  }

  async function handleAbandon() {
    setError('')
    try {
      await abandon.mutateAsync(quest.id)
      setConfirming(false)
      const message = 'Mission abandonnée. Ton XP reste acquis.'
      announce(message)
      toast(message)
    } catch (cause) {
      showError(cause)
    }
  }

  const classes = [
    'lr-q',
    isBoss ? 'lr-q--boss' : undefined,
    quest.status === 'COMPLETED' ? 'lr-q--done' : undefined,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <article className={classes} style={cardStyle} tabIndex={0} aria-label={quest.title}>
      <svg
        className="lr-q-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: link.glyph }}
      />
      <div className="lr-q-body">
        <h3 className="lr-q-title">{quest.title}</h3>
        <div className="lr-q-meta">
          <span className="lr-pill lr-pill--territory">{link.statCode}</span>
          <span className={isBoss ? 'lr-pill lr-pill--boss' : 'lr-pill'}>
            {QUEST_TYPE_LABELS[quest.quest_type]}
          </span>
          <span className="lr-pill">{DIFFICULTY_LABELS[quest.difficulty]}</span>
          <span className="lr-pill">{PRIORITY_LABELS[quest.priority]}</span>
          {quest.due_date ? (
            <span className="lr-pill">Échéance {formatDate(quest.due_date)}</span>
          ) : null}
          <span className="lr-xp">+{quest.xp_reward} XP</span>
        </div>
        {quest.steps.length > 0 ? (
          <div className="lr-q-steps">
            <p className="lr-q-step-count">
              {doneSteps} / {quest.steps.length} étapes
            </p>
            {quest.steps.map((step) => (
              <label key={step.id} className="lr-q-step">
                <input
                  type="checkbox"
                  checked={step.is_done}
                  disabled={stepsLocked}
                  onChange={() => void handleStep(step.id)}
                />
                <span>{step.title}</span>
                {step.is_required ? <span className="lr-q-required">obligatoire</span> : null}
              </label>
            ))}
          </div>
        ) : null}
      </div>
      <div className="lr-q-actions">
        <Button
          variant={isBoss && action.label === 'Affronter' ? 'solid' : 'default'}
          onClick={handleAction}
          disabled={action.disabled || complete.isPending || accept.isPending}
        >
          {action.label}
        </Button>
        {!stepsLocked ? (
          <button type="button" className="lr-q-menu" onClick={() => setConfirming(true)}>
            Abandonner
          </button>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="lr-q-error">
          {error}
        </p>
      ) : null}
      {confirming ? (
        <div
          className="lr-q-dialog"
          role="dialog"
          aria-modal="true"
          aria-label="Abandonner cette mission ?"
        >
          <p>Abandonner cette mission ? Ton XP reste acquis.</p>
          <div className="lr-q-dialog-actions">
            <button
              ref={cancelRef}
              type="button"
              className="lr-btn lr-btn--quiet"
              onClick={() => setConfirming(false)}
            >
              Annuler
            </button>
            <Button
              variant="solid"
              onClick={() => void handleAbandon()}
              disabled={abandon.isPending}
            >
              Abandonner
            </Button>
          </div>
        </div>
      ) : null}
    </article>
  )
}
