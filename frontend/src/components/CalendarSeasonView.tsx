import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { activityClass } from '../lib/calendarActivity'
import { eachDate, formatDayLabel, formatIsoDate } from '../lib/calendarDates'
import type { CssVars } from '../lib/css'
import { TERRITORY_BY_CODE } from '../lib/labels'
import { useCalendar, useCurrentSeason } from '../lib/queries'
import type { CalendarDay, CalendarEntry } from '../lib/types'

type CalendarSeasonViewProps = {
  today: string
  onOpenDay: (date: string) => void
}

const MARKER_CLASS = {
  SCHEDULED: 'lr-cal-marker lr-cal-marker--scheduled',
  DUE: 'lr-cal-marker lr-cal-marker--due',
  STEP: 'lr-cal-marker lr-cal-marker--step',
} as const

const MAIN_QUEST_TYPES = ['MAIN', 'BOSS'] as const

type MarkerEntry = CalendarEntry & { kind: keyof typeof MARKER_CLASS }

function markersFor(day: CalendarDay | undefined): MarkerEntry[] {
  return (day?.entries ?? []).filter(
    (entry): entry is MarkerEntry =>
      entry.kind in MARKER_CLASS &&
      (MAIN_QUEST_TYPES as readonly string[]).includes(entry.quest.quest_type),
  )
}

function markerTitle(entry: MarkerEntry): string {
  return entry.kind === 'STEP' && entry.step ? entry.step.title : entry.quest.title
}

export function CalendarSeasonView({ today, onOpenDay }: CalendarSeasonViewProps) {
  const seasonQuery = useCurrentSeason()
  const season = seasonQuery.data
  const dates = useMemo(
    () => (season ? eachDate(season.start_date, season.end_date, 100) : []),
    [season],
  )
  const query = useCalendar(season?.start_date ?? '', season?.end_date ?? '', Boolean(season))

  if (seasonQuery.isPending) {
    return <p className="lr-note">Chargement de la saison…</p>
  }
  if (!season) {
    return (
      <div className="lr-cal-season-empty">
        <p>Aucune saison active pour le moment.</p>
        <Link to="/saisons">Saisons</Link>
      </div>
    )
  }

  if (query.isPending) {
    return <p className="lr-note">Chargement de la saison…</p>
  }
  if (query.isError || !query.data) {
    return (
      <p role="alert" className="lr-note">
        Calendrier indisponible pour le moment.
      </p>
    )
  }

  const daysById = new Map<string, CalendarDay>(query.data.days.map((day) => [day.date, day]))
  const objectives = season.objectives ?? []
  const mainObjective = objectives.find((objective) => objective.is_main)
  const otherObjectives = objectives.filter((objective) => !objective.is_main)

  return (
    <div className="lr-cal-season">
      <div className="lr-cal-season-head">
        <h2 className="lr-subtitle">
          Saison {season.number} · {season.name}
        </h2>
        <p className="lr-note">
          {formatIsoDate(season.start_date)} → {formatIsoDate(season.end_date)}
        </p>
      </div>

      <section className="lr-cal-season-bar-section" aria-label="Barre de la saison">
        <div className="lr-cal-season-scroll">
          <div className="lr-cal-season-bar">
            {dates.map((dayIso) => {
              const day = daysById.get(dayIso)
              const count = day?.summary.completions ?? 0
              const territory = day?.summary.dominant_territory
              const style: CssVars | undefined = territory
                ? { '--c': TERRITORY_BY_CODE[territory].color }
                : undefined
              const markers = markersFor(day)
              const isToday = dayIso === today || day?.is_today === true
              const classes = [
                'lr-cal-season-day',
                count > 0 ? activityClass(count) : '',
                isToday ? 'lr-cal-season-day--today' : '',
              ]
                .filter(Boolean)
                .join(' ')
              const markerText = markers.map(markerTitle).join(', ')
              const label = `${formatDayLabel(dayIso)}, ${count} validation${count > 1 ? 's' : ''}${
                markerText ? `, repère : ${markerText}` : ''
              }`
              return (
                <button
                  key={dayIso}
                  type="button"
                  className={classes}
                  style={style}
                  aria-label={label}
                  aria-current={isToday ? 'date' : undefined}
                  title={markerText || undefined}
                  onClick={() => onOpenDay(dayIso)}
                >
                  {markers.map((marker, index) => (
                    <span key={`${marker.kind}-${index}`} className={MARKER_CLASS[marker.kind]} />
                  ))}
                </button>
              )
            })}
          </div>
        </div>
        <p className="lr-cal-live lr-cal-season-legend">
          Le jour courant est entouré. Les repères indiquent les étapes et les missions principales.
        </p>
      </section>

      <section className="lr-cal-season-objectives" aria-label="Objectifs de la saison">
        <h3 className="lr-detail-subtitle">Objectifs de la saison</h3>
        {objectives.length === 0 ? (
          <p className="lr-note">Aucun objectif pour cette saison.</p>
        ) : (
          <ul>
            {mainObjective ? (
              <li className="lr-cal-objective lr-cal-objective--main">
                <span className="lr-eyebrow">Objectif principal</span>
                <span>{mainObjective.title}</span>
              </li>
            ) : null}
            {otherObjectives.map((objective) => (
              <li key={objective.id} className="lr-cal-objective">
                {objective.title}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
