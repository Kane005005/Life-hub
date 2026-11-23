import { useState } from 'react'
import type { CSSProperties } from 'react'
import '../styles/seasons.css'
import { useFx } from '../features/fx/useFx'
import { ApiError } from '../lib/api'
import { formatDate } from '../lib/format'
import { SEASON_STATUS_LABELS, TERRITORY_BY_CODE, territoryLabel } from '../lib/labels'
import { useAchievements, useSkillTrees, useUpdateSeason } from '../lib/queries'
import type { Season, SeasonObjective, TerritoryCode } from '../lib/types'
import { HudFrame } from './HudFrame'

type SeasonCardProps = {
  season: Season
  featured?: boolean
}

const DAY_MS = 86_400_000

function parsedDay(value: string | null | undefined): number | null {
  if (!value) return null
  const time = Date.parse(value)
  return Number.isNaN(time) ? null : time
}

function timeProgress(season: Season): { total: number; elapsed: number; ready: boolean } {
  const start = parsedDay(season.start_date)
  const end = parsedDay(season.end_date)
  const daysLeft = Number.isFinite(season.days_left) ? season.days_left : null
  if (start === null || end === null || end < start || daysLeft === null) {
    return { total: 0, elapsed: 0, ready: false }
  }
  // Dates de début et de fin incluses : une saison du 23/11 au 20/02 dure 90 jours.
  const total = Math.max(1, Math.round((end - start) / DAY_MS) + 1)
  const elapsed = Math.min(total, Math.max(0, total - daysLeft))
  return { total, elapsed, ready: true }
}

export function SeasonCard({ season, featured = false }: SeasonCardProps) {
  const updateSeason = useUpdateSeason()
  const { announce } = useFx()
  const [error, setError] = useState('')
  const isActive = season.status === 'ACTIVE'
  const objectives = season.objectives ?? []
  const mainObjective = objectives.find((objective) => objective.is_main)
  const secondaryObjectives = objectives.filter((objective) => !objective.is_main)
  const priorityTerritories = season.priority_territories ?? []
  const summary = season.summary
  const xpByTerritory = summary?.xp_by_territory ?? {}
  const achievementsUnlocked = summary?.achievements_unlocked ?? []
  const skillsUnlocked = summary?.skills_unlocked ?? []
  // Le bilan renvoie des codes : on affiche les noms lus dans l'API (succès, arbres).
  const achievementsQuery = useAchievements()
  const skillTreesQuery = useSkillTrees()
  const achievementNames = new Map<string, string>()
  if (Array.isArray(achievementsQuery.data)) {
    for (const achievement of achievementsQuery.data) {
      achievementNames.set(achievement.code, achievement.label)
    }
  }
  const skillNames = new Map<string, string>()
  if (Array.isArray(skillTreesQuery.data)) {
    for (const tree of skillTreesQuery.data) {
      for (const branch of tree.branches ?? []) {
        for (const skill of branch.skills ?? []) {
          skillNames.set(skill.code, skill.name)
        }
      }
    }
  }
  const objectivesDone = summary?.objectives_done ?? 0
  const objectivesTotal = summary?.objectives_total ?? 0
  const objectiveWidth =
    objectivesTotal > 0 ? Math.min(100, Math.max(0, (objectivesDone / objectivesTotal) * 100)) : 0
  const maxXp = Math.max(1, ...Object.values(xpByTerritory).map((value) => value ?? 0))
  const daysLeft = Number.isFinite(season.days_left) ? season.days_left : null
  const progress = timeProgress(season)

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

  function renderObjective(objective: SeasonObjective) {
    return (
      <label className="lr-q-step lr-season-check">
        <input
          type="checkbox"
          checked={objective.is_done}
          disabled={!isActive || updateSeason.isPending}
          aria-label={objective.title}
          onChange={(event) => void handleObjectiveToggle(objective.id, event.target.checked)}
        />
        <span>{objective.title}</span>
      </label>
    )
  }

  return (
    <HudFrame className={featured ? 'lr-season-card lr-season-card--featured' : 'lr-season-card'}>
      <header className={featured ? 'lr-season-head lr-season-head--featured' : 'lr-season-head'}>
        <div>
          <p className="lr-eyebrow">Saison {season.number}</p>
          <h3
            className={featured ? 'lr-season-title lr-season-title--featured' : 'lr-season-title'}
          >
            {season.name}
          </h3>
          {season.theme ? <p className="lr-season-theme">{season.theme}</p> : null}
        </div>
        <span className="lr-pill">{SEASON_STATUS_LABELS[season.status]}</span>
      </header>

      {progress.ready ? (
        <div className="lr-season-time">
          <div className="lr-season-time-head">
            <span className="lr-detail-subtitle">Temps de la saison</span>
            <span className="num">
              Jour {progress.elapsed} sur {progress.total}
            </span>
          </div>
          <div
            className="lr-rail lr-season-time-rail"
            role="progressbar"
            aria-label="Temps écoulé de la saison"
            aria-valuemin={0}
            aria-valuemax={progress.total}
            aria-valuenow={progress.elapsed}
          >
            <i
              className="lr-fill lr-season-time-fill"
              style={{ width: `${(progress.elapsed / progress.total) * 100}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="lr-season-time lr-season-time--unavailable">
          <p className="lr-note">Durée indisponible.</p>
        </div>
      )}
      {season.start_date || season.end_date ? (
        <p className="lr-note">
          Du {formatDate(season.start_date)} au {formatDate(season.end_date)}
        </p>
      ) : null}
      {daysLeft !== null ? (
        <p className="lr-note">
          <span className="num">{daysLeft}</span> {daysLeft > 1 ? 'jours restants' : 'jour restant'}
        </p>
      ) : null}

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

      <section className="lr-season-objectives">
        <div className="lr-season-objectives-head">
          <p className="lr-detail-subtitle">Objectifs</p>
          <p className="lr-season-objective-count num">
            {objectivesDone} / {objectivesTotal} objectifs atteints
          </p>
        </div>
        <div
          className="lr-rail lr-season-objective-rail"
          role="progressbar"
          aria-label="Objectifs atteints"
          aria-valuemin={0}
          aria-valuemax={objectivesTotal}
          aria-valuenow={objectivesDone}
        >
          <i className="lr-fill lr-season-objective-fill" style={{ width: `${objectiveWidth}%` }} />
        </div>
        {mainObjective ? (
          <HudFrame className="lr-season-main-objective">
            <p className="lr-eyebrow">Objectif principal</p>
            {renderObjective(mainObjective)}
          </HudFrame>
        ) : null}
        {secondaryObjectives.length > 0 ? (
          <ul className="lr-detail-quests lr-season-secondary-list">
            {secondaryObjectives.map((objective) => (
              <li key={objective.id} className="lr-season-secondary-item">
                {renderObjective(objective)}
              </li>
            ))}
          </ul>
        ) : null}
        {objectives.length === 0 ? (
          <p className="lr-note">Aucun objectif pour cette saison.</p>
        ) : null}
      </section>

      <section className="lr-season-summary">
        <p className="lr-eyebrow">Bilan</p>
        <div className="lr-season-summary-grid">
          <div className="lr-season-xp">
            <p className="lr-detail-subtitle">XP total</p>
            <p className="lr-season-xp-value num">{summary?.xp_total ?? 0}</p>
          </div>
          <dl className="lr-season-stats">
            <div>
              <dt>Validations</dt>
              <dd className="num">{summary?.completions ?? 0}</dd>
            </div>
            <div>
              <dt>Niveaux gagnés</dt>
              <dd className="num">{summary?.levels_gained ?? 0}</dd>
            </div>
            <div>
              <dt>Objectifs faits</dt>
              <dd className="num">
                {objectivesDone} / {objectivesTotal}
              </dd>
            </div>
          </dl>
        </div>

        {Object.keys(xpByTerritory).length > 0 ? (
          <div className="lr-season-bars" aria-label="XP par territoire">
            {Object.entries(xpByTerritory).map(([code, xp]) => {
              const territory = code as TerritoryCode
              const color = TERRITORY_BY_CODE[territory]?.color ?? '#93A19A'
              const value = xp ?? 0
              return (
                <div key={code} className="lr-season-bar-row">
                  <span
                    className="lr-pill lr-pill--territory"
                    style={{ '--c': color } as CSSProperties}
                  >
                    {TERRITORY_BY_CODE[territory]?.statCode ?? code}
                  </span>
                  <span className="lr-season-bar-name">{territoryLabel(territory)}</span>
                  <div className="lr-detail-bar lr-season-bar">
                    <i
                      className="lr-season-bar-fill"
                      style={{ width: `${(value / maxXp) * 100}%`, backgroundColor: color }}
                    />
                  </div>
                  <span className="num lr-season-bar-value">{value}</span>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="lr-note">Aucune XP par territoire.</p>
        )}

        <div className="lr-season-unlocks">
          <div>
            <p className="lr-detail-subtitle">Succès obtenus</p>
            {achievementsUnlocked.length > 0 ? (
              <ul className="lr-season-unlock-list">
                {achievementsUnlocked.map((code) => (
                  <li key={code} className="lr-pill lr-season-unlock">
                    {achievementNames.get(code) ?? code}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="lr-note">Aucun succès.</p>
            )}
          </div>
          <div>
            <p className="lr-detail-subtitle">Compétences obtenues</p>
            {skillsUnlocked.length > 0 ? (
              <ul className="lr-season-unlock-list">
                {skillsUnlocked.map((code) => (
                  <li key={code} className="lr-pill lr-season-unlock">
                    {skillNames.get(code) ?? code}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="lr-note">Aucune compétence.</p>
            )}
          </div>
        </div>
      </section>

      {error ? (
        <p role="alert" className="lr-field-error">
          {error}
        </p>
      ) : null}
    </HudFrame>
  )
}
