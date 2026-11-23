import { useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError } from '../lib/api'
import { TERRITORY_BY_CODE, TERRITORY_CODES } from '../lib/labels'
import { useCreateSeason, useUpdateSeason } from '../lib/queries'
import type { Season, TerritoryCode } from '../lib/types'
import { Button } from './Button'
import { HudFrame } from './HudFrame'

type SeasonFormProps = {
  season?: Season
  onSaved?: () => void
  onCancel?: () => void
}

type ObjectiveDraft = { title: string; is_main: boolean }

export function SeasonForm({ season, onSaved, onCancel }: SeasonFormProps) {
  const createSeason = useCreateSeason()
  const updateSeason = useUpdateSeason()
  const [name, setName] = useState(season?.name ?? '')
  const [theme, setTheme] = useState(season?.theme ?? '')
  const [startDate, setStartDate] = useState(season?.start_date ?? '')
  const [priorities, setPriorities] = useState<TerritoryCode[]>(season?.priority_territories ?? [])
  const [objectives, setObjectives] = useState<ObjectiveDraft[]>(
    season?.objectives.map((objective) => ({
      title: objective.title,
      is_main: objective.is_main,
    })) ?? [{ title: '', is_main: true }],
  )
  const [error, setError] = useState('')
  const isSaving = createSeason.isPending || updateSeason.isPending

  const secondaryCount = objectives.filter((objective) => !objective.is_main).length

  function togglePriority(code: TerritoryCode) {
    setPriorities((current) =>
      current.includes(code) ? current.filter((item) => item !== code) : [...current, code],
    )
  }

  function updateObjective(index: number, patch: Partial<ObjectiveDraft>) {
    setObjectives((current) =>
      current.map((objective, i) => (i === index ? { ...objective, ...patch } : objective)),
    )
  }

  function addSecondary() {
    if (secondaryCount >= 3) return
    setObjectives((current) => [...current, { title: '', is_main: false }])
  }

  function removeObjective(index: number) {
    setObjectives((current) => current.filter((_, i) => i !== index))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const cleaned = objectives.filter((objective) => objective.title.trim())
    const mainCount = cleaned.filter((objective) => objective.is_main).length
    if (mainCount !== 1) {
      setError('Ajoute exactement un objectif principal.')
      return
    }
    if (cleaned.filter((objective) => !objective.is_main).length > 3) {
      setError('Tu peux ajouter au plus 3 objectifs secondaires.')
      return
    }
    try {
      const input = {
        name,
        theme,
        start_date: startDate || undefined,
        priority_territories: priorities,
        objectives: cleaned.map((objective) => ({
          title: objective.title,
          is_main: objective.is_main,
        })),
      }
      if (season) {
        await updateSeason.mutateAsync({ id: season.id, input })
      } else {
        await createSeason.mutateAsync(input)
      }
      onSaved?.()
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.detail : 'Enregistrement impossible.')
    }
  }

  return (
    <HudFrame as="form" className="lr-quest-form" onSubmit={handleSubmit}>
      <h3 className="lr-form-title">{season ? 'Modifier la saison' : 'Nouvelle saison'}</h3>
      <div className="lr-form-grid">
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
          <span>Thème</span>
          <input type="text" value={theme} onChange={(event) => setTheme(event.target.value)} />
        </label>
        <label className="lr-field">
          <span>Date de début</span>
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
        </label>
      </div>

      <fieldset className="lr-fieldset">
        <legend>Territoires prioritaires</legend>
        <div className="lr-choices">
          {TERRITORY_CODES.map((code) => (
            <label key={code} className="lr-choice">
              <input
                type="checkbox"
                checked={priorities.includes(code)}
                onChange={() => togglePriority(code)}
              />
              <span>{TERRITORY_BY_CODE[code].statCode}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="lr-fieldset">
        <legend>Objectifs</legend>
        <div className="lr-quest-form">
          {objectives.map((objective, index) => (
            <div key={index} className="lr-step-editor">
              <input
                type="text"
                aria-label={
                  objective.is_main ? 'Objectif principal' : `Objectif secondaire ${index}`
                }
                value={objective.title}
                onChange={(event) => updateObjective(index, { title: event.target.value })}
              />
              <label className="lr-step-required">
                <input
                  type="checkbox"
                  checked={objective.is_main}
                  onChange={(event) => updateObjective(index, { is_main: event.target.checked })}
                />
                Principal
              </label>
              {!objective.is_main ? (
                <button
                  type="button"
                  className="lr-step-remove"
                  onClick={() => removeObjective(index)}
                >
                  Retirer
                </button>
              ) : null}
            </div>
          ))}
        </div>
        <Button type="button" variant="quiet" disabled={secondaryCount >= 3} onClick={addSecondary}>
          Ajouter un objectif secondaire
        </Button>
        <p className="lr-field-help">1 objectif principal et jusqu'à 3 secondaires.</p>
      </fieldset>

      {error ? (
        <p role="alert" className="lr-field-error">
          {error}
        </p>
      ) : null}
      <div className="lr-form-actions">
        <Button type="submit" variant="solid" disabled={isSaving}>
          {season ? 'Enregistrer' : 'Créer la saison'}
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
