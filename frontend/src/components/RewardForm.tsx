import { useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError } from '../lib/api'
import { useCreateReward, useUpdateReward } from '../lib/queries'
import type { ShopItem } from '../lib/types'
import { Button } from './Button'
import { HudFrame } from './HudFrame'

type RewardFormProps = {
  reward?: ShopItem
  onSaved?: () => void
  onCancel?: () => void
}

export function RewardForm({ reward, onSaved, onCancel }: RewardFormProps) {
  const createReward = useCreateReward()
  const updateReward = useUpdateReward()
  const [name, setName] = useState(reward?.name ?? '')
  const [description, setDescription] = useState(reward?.description ?? '')
  const [cost, setCost] = useState(reward?.cost ?? 1)
  const [isAvailable, setIsAvailable] = useState(reward?.is_available ?? true)
  const [error, setError] = useState('')
  const isSaving = createReward.isPending || updateReward.isPending

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    try {
      if (reward) {
        await updateReward.mutateAsync({
          id: reward.id,
          input: { name, description, cost, is_available: isAvailable },
        })
      } else {
        await createReward.mutateAsync({ name, description, cost })
      }
      onSaved?.()
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.detail : 'Enregistrement impossible.')
    }
  }

  return (
    <HudFrame as="form" className="lr-quest-form" onSubmit={handleSubmit}>
      <h3 className="lr-form-title">{reward ? 'Modifier la récompense' : 'Nouvelle récompense'}</h3>
      <label className="lr-field">
        <span>Nom</span>
        <input
          type="text"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <label className="lr-field">
        <span>Description</span>
        <textarea
          rows={3}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </label>
      <label className="lr-field">
        <span>Coût en crédits</span>
        <input
          type="number"
          min={1}
          required
          value={cost}
          onChange={(event) => setCost(Number(event.target.value))}
        />
      </label>
      {reward ? (
        <label className="lr-choice">
          <input
            type="checkbox"
            checked={isAvailable}
            onChange={(event) => setIsAvailable(event.target.checked)}
          />
          <span>Disponible</span>
        </label>
      ) : null}
      {error ? (
        <p role="alert" className="lr-field-error">
          {error}
        </p>
      ) : null}
      <div className="lr-form-actions">
        <Button type="submit" variant="solid" disabled={isSaving}>
          {reward ? 'Enregistrer' : 'Créer la récompense'}
        </Button>
        {onCancel ? (
          <Button variant="quiet" onClick={onCancel}>
            Annuler
          </Button>
        ) : null}
      </div>
    </HudFrame>
  )
}
