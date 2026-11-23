import { useState } from 'react'
import type { CSSProperties } from 'react'
import { useFx } from '../features/fx/useFx'
import { ApiError } from '../lib/api'
import { formatDate } from '../lib/format'
import { SEASON_STATUS_LABELS, TERRITORY_BY_CODE } from '../lib/labels'
import { useUpdateSeason } from '../lib/queries'
import type { Season } from '../lib/types'
import { HudFrame } from './HudFrame'

type SeasonCardProps = {
  season: Season
}

export function SeasonCard({ season }: SeasonCardProps) {
  const updateSeason = useUpdateSeason()
  const { announce } = useFx()
  const [error, setError] = useState('')
  const isActive = season.status === 'ACTIVE'
  const objectives = season.objectives ?? []
  const priorityTerritories = season.priority_territories ?? []
  const summary = season.summary
  const xpByTerritory = summary?.xp_by_territory ?? {}
  const achievementsUnlocked = summary?.achievements_unlocked ?? []
  const skillsUnlocked = summary?.skills_unlocked ?? []

  async function handleObjectiveToggle(objectiveId: number, isDone: boolean) {
    setError('')
    try {
      await updateSeason.mutateAsync({
        id: season.id,
        input: {
          objectives: objectives.map((objective) =>
            objective.id === objectiveId
              ? { title: objective.title, is_main: objective.is_main, is_done: isDone }
              : {
                  title: objective.title,
                  is_main: objective.is_main,
                  is_done: objective.is_done,
                },
          ),
        },
      })
      announce('Objectif mis à jour.')
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.detail : 'Mise à jour impossible.')
    }
  }

  return (
    <HudFrame className="lr-season-card">
      <div className="lr-season-head">
        <div>
          <p className="lr-detail-code">Saison {season.number}</p>
          <h3 className="lr-form-title">{season.name}</h3>
          {season.theme ? <p className="lr-note">{season.theme}</p> : null}
        </div>
        <span className="lr-pill">{SEASON_STATUS_LABELS[season.status]}</span>
      </div>
      <p className="lr-note">
        Du {formatDate(season.start_date)} au {formatDate(season.end_date)}
      </p>
      <p className="lr-note">
        <span className="num">{season.days_left}</span> jours restants
      </p>
      {priorityTerritories.length > 0 ? (
        <div className="lr-q-meta" aria-label="Territoires prioritaires">
          {priorityTerritories.map((code) => (
            <span
              key={code}
              className="lr-pill lr-pill--territory"
              style={{ '--c': TERRITORY_BY_CODE[code]?.color ?? '#93A19A' } as CSSProperties}
            >
              {TERRITORY_BY_CODE[code]?.statCode ?? code}
            </span>
          ))}
        </div>
      ) : null}
      <div>
        <p className="lr-detail-subtitle">Objectifs</p>
        <ul className="lr-detail-quests">
          {objectives.map((objective) => (
            <li key={objective.id} className={objective.is_main ? 'lr-season-objective-main' : ''}>
              <label className="lr-q-step">
                <input
                  type="checkbox"
                  checked={objective.is_done}
                  disabled={!isActive || updateSeason.isPending}
                  aria-label={objective.title}
                  onChange={(event) =>
                    void handleObjectiveToggle(objective.id, event.target.checked)
                  }
                />
                <span>{objective.title}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>
      <div className="lr-season-summary">
        <p className="lr-detail-subtitle">Bilan</p>
        <p className="lr-note">
          XP total : <span className="num">{summary?.xp_total ?? 0}</span>
        </p>
        <p className="lr-note">
          Validations : <span className="num">{summary?.completions ?? 0}</span>
        </p>
        <p className="lr-note">
          Niveaux gagnés : <span className="num">{summary?.levels_gained ?? 0}</span>
        </p>
        <p className="lr-note">
          Objectifs faits : <span className="num">{summary?.objectives_done ?? 0}</span> /{' '}
          <span className="num">{summary?.objectives_total ?? 0}</span>
        </p>
        {achievementsUnlocked.length > 0 ? (
          <p className="lr-note">Succès obtenus : {achievementsUnlocked.join(', ')}</p>
        ) : null}
        {skillsUnlocked.length > 0 ? (
          <p className="lr-note">Compétences obtenues : {skillsUnlocked.join(', ')}</p>
        ) : null}
        <div className="lr-season-bars" aria-label="XP par territoire">
          {Object.entries(xpByTerritory).map(([code, xp]) => {
            const territory = code as keyof typeof TERRITORY_BY_CODE
            const max = Math.max(1, ...Object.values(xpByTerritory).map((v) => v ?? 0))
            const value = xp ?? 0
            return (
              <div key={code} className="lr-season-bar-row">
                <span
                  className="lr-pill lr-pill--territory"
                  style={
                    { '--c': TERRITORY_BY_CODE[territory]?.color ?? '#93A19A' } as CSSProperties
                  }
                >
                  {TERRITORY_BY_CODE[territory]?.statCode ?? code}
                </span>
                <div className="lr-detail-bar">
                  <i style={{ width: `${(value / max) * 100}%` }} />
                </div>
                <span className="num">{value}</span>
              </div>
            )
          })}
        </div>
      </div>
      {error ? (
        <p role="alert" className="lr-field-error">
          {error}
        </p>
      ) : null}
    </HudFrame>
  )
}
