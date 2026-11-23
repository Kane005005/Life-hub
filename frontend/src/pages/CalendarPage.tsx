import { useRef } from 'react'
import type { KeyboardEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import '../styles/calendar.css'
import { Button } from '../components/Button'
import { CalendarDayView } from '../components/CalendarDayView'
import { CalendarMonthView } from '../components/CalendarMonthView'
import { CalendarSeasonView } from '../components/CalendarSeasonView'
import { CalendarWeekView } from '../components/CalendarWeekView'
import {
  addDays,
  formatDayLabel,
  formatMonthLabel,
  isValidIso,
  shiftMonth,
  startOfWeek,
  todayIso,
} from '../lib/calendarDates'
import { CALENDAR_VIEWS, CALENDAR_VIEW_LABELS } from '../lib/labels'
import type { CalendarView } from '../lib/labels'
import { useCalendarToday } from '../lib/queries'

function readView(value: string | null): CalendarView {
  return CALENDAR_VIEWS.find((view) => view === value) ?? 'jour'
}

export function CalendarPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const view = readView(searchParams.get('vue'))
  const requestedDate = searchParams.get('date')
  const browserToday = todayIso()
  const date = isValidIso(requestedDate) ? requestedDate : browserToday
  const todayQuery = useCalendarToday()
  const todayFromApi = todayQuery.data?.date ?? null
  const today = isValidIso(todayFromApi) ? todayFromApi : browserToday
  const tabRefs = useRef<Record<CalendarView, HTMLButtonElement | null>>({
    jour: null,
    semaine: null,
    mois: null,
    saison: null,
  })

  function change(viewName: CalendarView, dateValue: string) {
    const params = new URLSearchParams(searchParams)
    params.set('vue', viewName)
    params.set('date', dateValue)
    setSearchParams(params)
  }

  function openDay(day: string) {
    change('jour', day)
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
      return
    }
    event.preventDefault()
    const index = CALENDAR_VIEWS.indexOf(view)
    const length = CALENDAR_VIEWS.length
    const nextIndex =
      event.key === 'ArrowRight' ? (index + 1) % length : (index - 1 + length) % length
    const next = CALENDAR_VIEWS[nextIndex]
    change(next, date)
    tabRefs.current[next]?.focus()
  }

  function shiftDate(direction: 1 | -1): string {
    if (view === 'jour') {
      return addDays(date, direction)
    }
    if (view === 'semaine') {
      return addDays(date, direction * 7)
    }
    return shiftMonth(date, direction)
  }

  const periodLabel =
    view === 'jour'
      ? formatDayLabel(date)
      : view === 'semaine'
        ? `Semaine du ${formatDayLabel(startOfWeek(date))}`
        : view === 'mois'
          ? formatMonthLabel(date)
          : 'Saison en cours'

  return (
    <section className="lr-section lr-cal-page">
      <p className="lr-eyebrow">04 · Calendrier</p>
      <h1 className="lr-title">Calendrier</h1>
      <p className="lr-lede">Ce que tu fais, quand tu le fais. Sans pression sur les jours calmes.</p>

      <div className="lr-cal-tabs" role="tablist" aria-label="Vues du calendrier">
        {CALENDAR_VIEWS.map((viewName) => (
          <button
            key={viewName}
            ref={(element) => {
              tabRefs.current[viewName] = element
            }}
            type="button"
            id={`lr-cal-tab-${viewName}`}
            role="tab"
            aria-selected={view === viewName}
            aria-controls="lr-cal-panel"
            tabIndex={view === viewName ? 0 : -1}
            className={view === viewName ? 'lr-cal-tab lr-cal-tab--on' : 'lr-cal-tab'}
            onClick={() => change(viewName, date)}
            onKeyDown={handleTabKeyDown}
          >
            {CALENDAR_VIEW_LABELS[viewName]}
          </button>
        ))}
      </div>

      <div className="lr-cal-toolbar">
        {view === 'saison' ? (
          <p className="lr-note">{periodLabel}</p>
        ) : (
          <>
            <div className="lr-cal-nav" aria-label="Navigation temporelle">
              <Button variant="quiet" onClick={() => change(view, shiftDate(-1))}>
                Précédent
              </Button>
              <span className="lr-cal-period">{periodLabel}</span>
              <Button variant="quiet" onClick={() => change(view, shiftDate(1))}>
                Suivant
              </Button>
            </div>
            <Button onClick={() => change(view, today)}>Aujourd'hui</Button>
          </>
        )}
      </div>

      <div
        id="lr-cal-panel"
        role="tabpanel"
        aria-labelledby={`lr-cal-tab-${view}`}
        className="lr-cal-panel"
      >
        {view === 'jour' ? <CalendarDayView date={date} today={today} /> : null}
        {view === 'semaine' ? <CalendarWeekView date={date} today={today} /> : null}
        {view === 'mois' ? (
          <CalendarMonthView date={date} today={today} onOpenDay={openDay} />
        ) : null}
        {view === 'saison' ? <CalendarSeasonView today={today} onOpenDay={openDay} /> : null}
      </div>
    </section>
  )
}
