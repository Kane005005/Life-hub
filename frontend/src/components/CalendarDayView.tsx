import { useState } from 'react'
import type { MouseEvent } from 'react'
import { useCelebrate } from '../features/fx/useCelebrate'
import { ApiError } from '../lib/api'
import { formatDayLabel } from '../lib/calendarDates'
import type { CssVars } from '../lib/css'
import { formatDateTime } from '../lib/format'
import {
  CALENDAR_ENTRY_LABELS,
  TERRITORY_BY_CODE,
  TERRITORY_CODES,
  territoryLabel,
} from '../lib/labels'
import { useCalendar, useCalendarToday, useCompleteQuest, useToggleStep } from '../lib/queries'
import type { CalendarEntry, TerritoryCode } from '../lib/types'
import { Button } from './Button'

type CalendarDayViewProps = {
  date: string
  today: string
}

function entryTitle(entry: CalendarEntry): string {
  return entry.kind === 'STEP' && entry.step ? entry.step.title : entry.quest.title
}

function remainingLabel(days: number): string {
  return `${days} jour${days > 1 ? 's' : ''} restant${days > 1 ? 's' : ''} cette semaine`
}

function CalendarCard({ entry, canComplete }: { entry: CalendarEntry; canComplete: boolean }) {
  const complete = useCompleteQuest()
  const toggleStep = useToggleStep()
  const celebrate = useCelebrate()
  const [error, setError] = useState('')
  const link = TERRITORY_BY_CODE[entry.quest.territory]
  const style: CssVars = { '--c': link.color }
  const classes = [
    'lr-cal-card',
    entry.kind === 'STEP' ? 'lr-cal-card--step' : undefined,
    entry.done ? 'lr-cal-card--done' : undefined,
  ]
    .filter(Boolean)
    .join(' ')

  function showError(cause: unknown) {
    setError(cause instanceof ApiError ? cause.detail : 'Action impossible.')
  }

  async function handleComplete(event: MouseEvent<HTMLButtonElement>) {
    const button = event.currentTarget
    setError('')
    try {
      const result = await complete.mutateAsync(entry.quest.id)
      celebrate(result, button)
    } catch (cause) {
      showError(cause)
    }
  }

  async function handleStep() {
    if (!entry.step) {
      return
    }
    setError('')
    try {
      await toggleStep.mutateAsync({ id: entry.quest.id, stepId: entry.step.id })
    } catch (cause) {
      showError(cause)
    }
  }

  return (
    <article className={classes} style={style} aria-label={entryTitle(entry)}>
      <span className="lr-pill lr-pill--territory">{link.statCode}</span>
      <div className="lr-cal-card-body">
        <h4 className="lr-cal-card-title">{entryTitle(entry)}</h4>
        {entry.kind === 'STEP' ? (
          <p className="lr-cal-parent">Étape de {entry.quest.title}</p>
        ) : null}
        <div className="lr-q-meta">
          <span className="lr-pill">{CALENDAR_ENTRY_LABELS[entry.kind]}</span>
          {entry.quest.scheduled_time ? (
            <span className="lr-pill">{entry.quest.scheduled_time}</span>
          ) : null}
          <span className="lr-xp">+{entry.quest.xp_reward} XP</span>
          {entry.quest.due_date ? (
            <span className="lr-pill">Échéance {formatDayLabel(entry.quest.due_date)}</span>
          ) : null}
          {entry.due_passed ? (
            <span className="lr-cal-past lr-cal-pill--neutral">échéance passée</span>
          ) : null}
        </div>
        {entry.step ? (
          <label className="lr-cal-step">
            <input
              type="checkbox"
              checked={entry.step.is_done}
              disabled={toggleStep.isPending}
              onChange={() => void handleStep()}
            />
            Étape terminée
          </label>
        ) : null}
        {error ? (
          <p role="alert" className="lr-field-error">
            {error}
          </p>
        ) : null}
      </div>
      {canComplete ? (
        <Button className="lr-cal-validate" onClick={(event) => void handleComplete(event)}>
          Valider
        </Button>
      ) : null}
    </article>
  )
}

export function CalendarDayView({ date, today }: CalendarDayViewProps) {
  const isToday = date === today
  const todayQuery = useCalendarToday(isToday)
  const rangeQuery = useCalendar(date, date, !isToday)
  const activeQuery = isToday ? todayQuery : rangeQuery
  const day = isToday ? todayQuery.data : rangeQuery.data?.days[0]
  const weekly = isToday ? (todayQuery.data?.weekly ?? []) : []

  if (activeQuery.isPending) {
    return <p className="lr-note">Chargement du calendrier…</p>
  }
  if (activeQuery.isError || !day) {
    return (
      <p role="alert" className="lr-note">
        Calendrier indisponible pour le moment.
      </p>
    )
  }

  const groups = TERRITORY_CODES.map((code: TerritoryCode) => ({
    code,
    entries: day.entries.filter((entry) => entry.quest.territory === code),
  })).filter((group) => group.entries.length > 0)

  return (
    <div className="lr-cal-day">
      <div className="lr-cal-day-head">
        <h2 className="lr-subtitle">{formatDayLabel(date)}</h2>
        {isToday ? <span className="lr-pill lr-cal-today-pill">Aujourd'hui</span> : null}
      </div>

      <section className="lr-cal-summary" aria-label="Résumé du jour">
        <p className="lr-eyebrow">Résumé du jour</p>
        <dl className="lr-cal-stats">
          <div>
            <dt>Validations</dt>
            <dd className="num">{day.summary.completions}</dd>
          </div>
          <div>
            <dt>XP gagnés</dt>
            <dd className="num">{day.summary.xp}</dd>
          </div>
          <div>
            <dt>Crédits gagnés</dt>
            <dd className="num">{day.summary.credits}</dd>
          </div>
          <div>
            <dt>Territoire dominant</dt>
            <dd>
              {day.summary.dominant_territory
                ? territoryLabel(day.summary.dominant_territory)
                : '—'}
            </dd>
          </div>
        </dl>
      </section>

      {weekly.length > 0 ? (
        <section className="lr-cal-weekly" aria-label="Hebdomadaires en cours">
          <h3 className="lr-detail-subtitle">Hebdomadaires en cours</h3>
          <ul>
            {weekly.map((item) => (
              <li key={item.quest.id} className="lr-cal-weekly-row">
                <span>{item.quest.title}</span>
                <span className="lr-cal-weekly-state">
                  {item.done ? 'Validée cette semaine' : remainingLabel(item.days_left_in_week)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="lr-cal-groups" aria-label="Missions du jour">
        <h3 className="lr-detail-subtitle">Missions du jour</h3>
        {groups.length === 0 ? (
          <p className="lr-note">Aucune mission prévue ce jour-là.</p>
        ) : (
          groups.map((group) => {
            const link = TERRITORY_BY_CODE[group.code]
            const style: CssVars = { '--c': link.color }
            return (
              <section key={group.code} className="lr-cal-group" style={style}>
                <h4 className="lr-cal-group-title">
                  <span className="lr-pill lr-pill--territory">{link.statCode}</span>
                  {territoryLabel(group.code)}
                </h4>
                <div className="lr-cal-cards">
                  {group.entries.map((entry, index) => (
                    <CalendarCard
                      key={`${entry.kind}-${entry.quest.id}-${entry.step?.id ?? index}`}
                      entry={entry}
                      canComplete={isToday && !entry.done}
                    />
                  ))}
                </div>
              </section>
            )
          })
        )}
      </section>

      <section className="lr-cal-completions" aria-label="Validations du jour">
        <h3 className="lr-detail-subtitle">Validations du jour</h3>
        {day.completions.length === 0 ? (
          <p className="lr-cal-empty">Aucune validation ce jour-là.</p>
        ) : (
          <ol className="lr-cal-completion-list">
            {day.completions.map((completion, index) => (
              <li key={`${completion.quest_id}-${index}`} className="lr-cal-completion">
                <span>{completion.title}</span>
                <span className="lr-cal-completion-meta">
                  {territoryLabel(completion.territory)} · +{completion.xp} XP · +
                  {completion.credits} crédits · {formatDateTime(completion.completed_at)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}
