import { useState } from 'react'
import type { DragEvent } from 'react'
import { formatDayLabel, weekDates } from '../lib/calendarDates'
import type { CssVars } from '../lib/css'
import { CALENDAR_ENTRY_LABELS, TERRITORY_BY_CODE } from '../lib/labels'
import { useCalendar, useRescheduleQuest, useRescheduleStep } from '../lib/queries'
import type { CalendarDay, CalendarEntry } from '../lib/types'

type CalendarWeekViewProps = {
  date: string
  today: string
}

type DragPayload = {
  kind: 'SCHEDULED' | 'STEP' | 'DUE'
  questId: number
  stepId?: number
}

const DRAG_KINDS = ['SCHEDULED', 'STEP', 'DUE'] as const

function isDraggable(entry: CalendarEntry): entry is CalendarEntry & { kind: DragPayload['kind'] } {
  return (DRAG_KINDS as readonly string[]).includes(entry.kind)
}

function parsePayload(raw: string): DragPayload | null {
  try {
    const value: unknown = JSON.parse(raw)
    if (!value || typeof value !== 'object') {
      return null
    }
    const candidate = value as Record<string, unknown>
    if (
      (candidate.kind === 'SCHEDULED' || candidate.kind === 'DUE' || candidate.kind === 'STEP') &&
      typeof candidate.questId === 'number'
    ) {
      return {
        kind: candidate.kind,
        questId: candidate.questId,
        ...(typeof candidate.stepId === 'number' ? { stepId: candidate.stepId } : {}),
      }
    }
  } catch {
    // Un glisser externe ne contient pas notre charge utile.
  }
  return null
}

function entryKey(entry: CalendarEntry): string {
  return `${entry.kind}-${entry.quest.id}-${entry.step?.id ?? 0}`
}

export function CalendarWeekView({ date, today }: CalendarWeekViewProps) {
  const days = weekDates(date)
  const from = days[0]
  const to = days[days.length - 1]
  const query = useCalendar(from, to)
  const rescheduleQuest = useRescheduleQuest()
  const rescheduleStep = useRescheduleStep()
  const [drag, setDrag] = useState<DragPayload | null>(null)
  const [overDate, setOverDate] = useState('')
  const [menuKey, setMenuKey] = useState('')
  const [message, setMessage] = useState('')

  async function move(payload: DragPayload, targetDate: string) {
    setMessage('')
    try {
      if (payload.kind === 'STEP' && payload.stepId !== undefined) {
        await rescheduleStep.mutateAsync({
          id: payload.questId,
          stepId: payload.stepId,
          scheduled_date: targetDate,
        })
      } else {
        await rescheduleQuest.mutateAsync({
          id: payload.questId,
          scheduled_date: targetDate,
        })
      }
      setMessage(`Mission replanifiée au ${formatDayLabel(targetDate)}.`)
    } catch {
      setMessage('Replanification impossible.')
    }
  }

  function handleDragStart(event: DragEvent<HTMLElement>, payload: DragPayload) {
    setDrag(payload)
    setMenuKey('')
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', JSON.stringify(payload))
    }
  }

  function handleDrop(event: DragEvent<HTMLElement>, targetDate: string) {
    event.preventDefault()
    const raw = event.dataTransfer?.getData('text/plain') ?? ''
    const payload = parsePayload(raw) ?? drag
    setOverDate('')
    setDrag(null)
    if (payload) {
      void move(payload, targetDate)
    }
  }

  function renderPlanned(entry: CalendarEntry) {
    const key = entryKey(entry)
    const payload: DragPayload = {
      kind: entry.kind as DragPayload['kind'],
      questId: entry.quest.id,
      ...(entry.step ? { stepId: entry.step.id } : {}),
    }
    const link = TERRITORY_BY_CODE[entry.quest.territory]
    const style: CssVars = { '--c': link.color }
    const title = entry.kind === 'STEP' && entry.step ? entry.step.title : entry.quest.title
    const busy = rescheduleQuest.isPending || rescheduleStep.isPending

    return (
      <div
        key={key}
        className="lr-cal-movable"
        style={style}
        draggable
        onDragStart={(event) => handleDragStart(event, payload)}
        onDragEnd={() => {
          setDrag(null)
          setOverDate('')
        }}
      >
        <div className="lr-cal-movable-head">
          <span className="lr-pill lr-pill--territory">{link.statCode}</span>
          <span className="lr-cal-movable-title">{title}</span>
        </div>
        <p className="lr-cal-movable-meta">
          {CALENDAR_ENTRY_LABELS[entry.kind]}
          {entry.due_passed ? ' · échéance passée' : ''}
        </p>
        <button
          type="button"
          className="lr-cal-move"
          onClick={() => setMenuKey((current) => (current === key ? '' : key))}
          disabled={busy}
        >
          Déplacer
        </button>
        {menuKey === key ? (
          <div className="lr-cal-move-menu" role="group" aria-label="Choisir le jour">
            {days.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => {
                  setMenuKey('')
                  void move(payload, day)
                }}
              >
                {formatDayLabel(day)}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    )
  }

  function renderRecurring(entry: CalendarEntry) {
    return (
      <label key={entryKey(entry)} className="lr-cal-line">
        <input type="checkbox" checked={entry.done} readOnly aria-label={entry.quest.title} />
        <span>{entry.quest.title}</span>
      </label>
    )
  }

  if (query.isPending) {
    return <p className="lr-note">Chargement de la semaine…</p>
  }
  if (query.isError || !query.data) {
    return (
      <p role="alert" className="lr-note">
        Calendrier indisponible pour le moment.
      </p>
    )
  }

  const daysById = new Map<string, CalendarDay>(query.data.days.map((day) => [day.date, day]))

  return (
    <div className="lr-cal-week">
      <p className="lr-note lr-cal-hint">
        Glisse une mission planifiée vers un autre jour, ou utilise son bouton Déplacer.
      </p>
      <div className="lr-cal-week-grid">
        {days.map((dayIso) => {
          const day = daysById.get(dayIso)
          const entries = day?.entries ?? []
          const planned = entries.filter(isDraggable)
          const recurring = entries.filter((entry) => !isDraggable(entry))
          const label = formatDayLabel(dayIso)
          const [weekday, ...rest] = label.split(' ')
          const isToday = dayIso === today || day?.is_today === true
          const columnClass = [
            'lr-cal-col',
            isToday ? 'lr-cal-col--today' : '',
            overDate === dayIso ? 'lr-cal-col--over' : '',
          ]
            .filter(Boolean)
            .join(' ')
          return (
            <section
              key={dayIso}
              className={columnClass}
              aria-label={label}
              onDragOver={(event) => {
                event.preventDefault()
                setOverDate(dayIso)
              }}
              onDragLeave={() => setOverDate((current) => (current === dayIso ? '' : current))}
              onDrop={(event) => handleDrop(event, dayIso)}
            >
              <h3 className="lr-cal-col-title">
                <span className="lr-cal-weekday">{weekday}</span>
                <span className="lr-cal-daynum">{rest.join(' ')}</span>
                {isToday ? <span className="lr-cal-today-pill">Aujourd'hui</span> : null}
              </h3>
              <div className="lr-cal-col-planned">
                {planned.length === 0 ? (
                  <p className="lr-cal-empty">Aucune mission planifiée.</p>
                ) : (
                  planned.map(renderPlanned)
                )}
              </div>
              <div className="lr-cal-col-recurring">{recurring.map(renderRecurring)}</div>
            </section>
          )
        })}
      </div>
      <p className="lr-cal-live" role="status" aria-live="polite">
        {message}
      </p>
    </div>
  )
}
