import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '../components/Button'
import { HudFrame } from '../components/HudFrame'
import { apiGet } from '../lib/api'
import { formatDateTime } from '../lib/format'
import {
  EVENT_TYPE_CODES,
  EVENT_TYPE_LABELS,
  TERRITORY_CODES,
  TERRITORY_LABELS,
} from '../lib/labels'
import { nextApiPath } from '../lib/pagination'
import { useJournal, useJournalSummary } from '../lib/queries'
import type { EventType, JournalEntry, Paginated, TerritoryCode } from '../lib/types'

function parseEventTypes(value: string | null): EventType[] {
  if (!value) return []
  return value
    .split(',')
    .filter((item): item is EventType => EVENT_TYPE_CODES.includes(item as EventType))
}

function JournalSummaryChart({ period }: { period: 'week' | 'month' }) {
  const summary = useJournalSummary(period)
  const data = summary.data
  if (!data) return <p className="lr-note">Chargement du résumé…</p>
  const xpByDay = data.xp_by_day ?? []
  const xpByTerritory = data.xp_by_territory ?? {}
  const max = Math.max(1, ...xpByDay.map((item) => item.xp))
  const width = 320
  const height = 80
  const barWidth = width / Math.max(1, xpByDay.length)
  const label = `XP par jour du ${data.from} au ${data.to}. ${xpByDay.map((item) => `${item.date} ${item.xp} XP`).join(', ')}.`
  return (
    <HudFrame className="lr-stack">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={label}
        className="lr-summary-chart"
      >
        {xpByDay.map((item, index) => {
          const barHeight = (item.xp / max) * (height - 10)
          return (
            <rect
              key={item.date}
              x={index * barWidth + 2}
              y={height - barHeight}
              width={Math.max(2, barWidth - 4)}
              height={barHeight}
              fill="var(--lr-emeraude-vive)"
              opacity="0.8"
            >
              <title>{`${item.date} : ${item.xp} XP`}</title>
            </rect>
          )
        })}
      </svg>
      <div className="lr-q-meta">
        <span className="lr-pill">Validations {data.completions}</span>
        <span className="lr-pill">Repos {data.rests}</span>
        <span className="lr-pill">Succès {data.achievements}</span>
        <span className="lr-pill">Compétences {data.skills}</span>
      </div>
      <div className="lr-season-bars" aria-label="XP par territoire">
        {Object.entries(xpByTerritory).map(([code, xp]) => (
          <div key={code} className="lr-season-bar-row">
            <span className="lr-pill">{TERRITORY_LABELS[code as TerritoryCode] ?? code}</span>
            <span className="num">{xp ?? 0} XP</span>
          </div>
        ))}
      </div>
    </HudFrame>
  )
}

export function JournalPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [extra, setExtra] = useState<JournalEntry[]>([])
  const [qInput, setQInput] = useState(searchParams.get('q') ?? '')
  const [period, setPeriod] = useState<'week' | 'month'>('week')
  const eventTypes = useMemo(() => parseEventTypes(searchParams.get('event_type')), [searchParams])
  const dateFrom = searchParams.get('date_from') ?? ''
  const dateTo = searchParams.get('date_to') ?? ''
  const territory = (searchParams.get('territory') ?? '') as TerritoryCode | ''
  const q = searchParams.get('q') ?? ''

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = new URLSearchParams(searchParams)
      if (qInput) next.set('q', qInput)
      else next.delete('q')
      setSearchParams(next, { replace: true })
    }, 300)
    return () => window.clearTimeout(timer)
  }, [qInput, searchParams, setSearchParams])

  const filters = useMemo(
    () => ({
      event_type: eventTypes.length > 0 ? eventTypes : undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      territory: territory || undefined,
      q: q || undefined,
    }),
    [dateFrom, dateTo, eventTypes, q, territory],
  )

  const journalQuery = useJournal(filters)
  const firstPage = journalQuery.data

  useEffect(() => {
    setExtra([])
  }, [dateFrom, dateTo, eventTypes, q, territory])

  async function loadMore() {
    if (!firstPage?.next) {
      return
    }
    try {
      const page = await apiGet<Paginated<JournalEntry>>(nextApiPath(firstPage.next))
      setExtra(page.results)
    } catch {
      // Le journal reste affiché, même si la page suivante échoue.
    }
  }

  const entries = [...(firstPage?.results ?? []), ...extra]

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next, { replace: true })
  }

  function toggleEventType(code: EventType) {
    const nextTypes = eventTypes.includes(code)
      ? eventTypes.filter((item) => item !== code)
      : [...eventTypes, code]
    updateParam('event_type', nextTypes.join(','))
  }

  return (
    <section className="lr-section">
      <p className="lr-eyebrow">04 · Journal</p>
      <h1 className="lr-title">Journal</h1>
      <p className="lr-lede">Chaque pas laisse une trace.</p>

      <div className="lr-form-actions">
        <Button variant={period === 'week' ? 'solid' : 'quiet'} onClick={() => setPeriod('week')}>
          7 derniers jours
        </Button>
        <Button variant={period === 'month' ? 'solid' : 'quiet'} onClick={() => setPeriod('month')}>
          30 derniers jours
        </Button>
      </div>
      <JournalSummaryChart period={period} />

      <div className="lr-filters" role="group" aria-label="Filtrer le journal">
        <label className="lr-field">
          <span>Du</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(event) => updateParam('date_from', event.target.value)}
          />
        </label>
        <label className="lr-field">
          <span>Au</span>
          <input
            type="date"
            value={dateTo}
            onChange={(event) => updateParam('date_to', event.target.value)}
          />
        </label>
        <label className="lr-field">
          <span>Territoire</span>
          <select
            value={territory}
            onChange={(event) => updateParam('territory', event.target.value)}
          >
            <option value="">Tous</option>
            {TERRITORY_CODES.map((code) => (
              <option key={code} value={code}>
                {TERRITORY_LABELS[code]}
              </option>
            ))}
          </select>
        </label>
        <label className="lr-field">
          <span>Recherche</span>
          <input type="search" value={qInput} onChange={(event) => setQInput(event.target.value)} />
        </label>
        <details className="lr-field">
          <summary>Types d'événements</summary>
          <div className="lr-choices">
            {EVENT_TYPE_CODES.map((code) => (
              <label key={code} className="lr-choice">
                <input
                  type="checkbox"
                  checked={eventTypes.includes(code)}
                  onChange={() => toggleEventType(code)}
                />
                <span>{EVENT_TYPE_LABELS[code]}</span>
              </label>
            ))}
          </div>
        </details>
      </div>

      {journalQuery.isPending ? <p className="lr-note">Chargement du journal…</p> : null}
      {journalQuery.isError ? (
        <p role="alert" className="lr-note">
          Journal indisponible pour le moment.
        </p>
      ) : null}
      {!journalQuery.isPending && entries.length === 0 ? (
        <p className="lr-note">Aucun événement pour le moment.</p>
      ) : null}

      {entries.length > 0 ? (
        <ol className="lr-journal-list" aria-live="polite">
          {entries.map((entry) => (
            <li key={entry.uuid} className="lr-journal-item">
              <time dateTime={entry.created_at}>{formatDateTime(entry.created_at)}</time>
              <span className="lr-pill">{EVENT_TYPE_LABELS[entry.event_type]}</span>
              <p>{entry.message}</p>
              <span className="lr-journal-actor">
                {entry.actor === 'user' ? 'Toi' : entry.actor}
              </span>
            </li>
          ))}
        </ol>
      ) : null}

      <div className="lr-logbar">
        {firstPage?.next ? (
          <Button variant="quiet" onClick={() => void loadMore()}>
            Charger plus
          </Button>
        ) : null}
      </div>
    </section>
  )
}
