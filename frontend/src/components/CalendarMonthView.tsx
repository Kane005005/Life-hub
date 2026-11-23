import { useMemo } from 'react'
import { activityClass } from '../lib/calendarActivity'
import { formatDayLabel, formatMonthLabel, monthGrid } from '../lib/calendarDates'
import type { CssVars } from '../lib/css'
import { TERRITORY_BY_CODE } from '../lib/labels'
import { useCalendar } from '../lib/queries'
import type { CalendarDay } from '../lib/types'

type CalendarMonthViewProps = {
  date: string
  today: string
  onOpenDay: (date: string) => void
}

const WEEKDAY_HEADERS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

export function CalendarMonthView({ date, today, onOpenDay }: CalendarMonthViewProps) {
  const dates = useMemo(() => monthGrid(date), [date])
  const from = dates[0]
  const to = dates[dates.length - 1]
  const query = useCalendar(from, to)

  if (query.isPending) {
    return <p className="lr-note">Chargement du mois…</p>
  }
  if (query.isError || !query.data) {
    return (
      <p role="alert" className="lr-note">
        Calendrier indisponible pour le moment.
      </p>
    )
  }

  const daysById = new Map<string, CalendarDay>(query.data.days.map((day) => [day.date, day]))
  const monthPrefix = date.slice(0, 7)
  const activeDays = query.data.days.filter(
    (day) => day.date.startsWith(monthPrefix) && day.summary.completions > 0,
  ).length

  return (
    <div className="lr-cal-month">
      <div className="lr-cal-month-head">
        <h2 className="lr-subtitle">{formatMonthLabel(date)}</h2>
        <p className="lr-cal-count">
          {activeDays} jour{activeDays > 1 ? 's' : ''} actif{activeDays > 1 ? 's' : ''} ce mois-ci
        </p>
      </div>
      <div className="lr-cal-month-grid" aria-label={`Calendrier de ${formatMonthLabel(date)}`}>
        {WEEKDAY_HEADERS.map((weekday) => (
          <div key={weekday} className="lr-cal-weekday-header">
            {weekday}
          </div>
        ))}
        {dates.map((dayIso) => {
          const day = daysById.get(dayIso)
          const count = day?.summary.completions ?? 0
          const territory = day?.summary.dominant_territory
          const style: CssVars | undefined = territory
            ? { '--c': TERRITORY_BY_CODE[territory].color }
            : undefined
          const isToday = dayIso === today || day?.is_today === true
          const classes = [
            'lr-cal-day',
            count > 0 ? activityClass(count) : '',
            isToday ? 'lr-cal-day--today' : '',
            dayIso.startsWith(monthPrefix) ? '' : 'lr-cal-day--outside',
          ]
            .filter(Boolean)
            .join(' ')
          const label = `${formatDayLabel(dayIso)}, ${count} validation${count > 1 ? 's' : ''}`
          return (
            <button
              key={dayIso}
              type="button"
              className={classes}
              style={style}
              aria-label={label}
              aria-current={isToday ? 'date' : undefined}
              onClick={() => onOpenDay(dayIso)}
            >
              <span className="lr-cal-day-num num">{Number(dayIso.slice(-2))}</span>
              {count > 0 ? <span className="lr-cal-day-count num">{count}</span> : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
