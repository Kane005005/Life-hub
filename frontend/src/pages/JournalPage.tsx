import { useEffect, useState } from 'react'
import { Button } from '../components/Button'
import { apiGet } from '../lib/api'
import { formatDateTime } from '../lib/format'
import { EVENT_TYPE_CODES, EVENT_TYPE_LABELS } from '../lib/labels'
import { nextApiPath } from '../lib/pagination'
import { useJournal } from '../lib/queries'
import type { EventType, JournalEntry, Paginated } from '../lib/types'

export function JournalPage() {
  const [eventType, setEventType] = useState<EventType | ''>('')
  const [extra, setExtra] = useState<JournalEntry[]>([])
  const filters = eventType ? { event_type: eventType } : undefined
  const journalQuery = useJournal(filters)
  const firstPage = journalQuery.data

  useEffect(() => {
    setExtra([])
  }, [eventType])

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

  return (
    <section className="lr-section">
      <p className="lr-eyebrow">04 · Journal</p>
      <h1 className="lr-title">Journal</h1>
      <p className="lr-lede">Chaque pas laisse une trace.</p>

      <div className="lr-filters" role="group" aria-label="Filtrer le journal">
        <label className="lr-field">
          <span>Type d'événement</span>
          <select
            value={eventType}
            onChange={(event) => setEventType(event.target.value as EventType | '')}
          >
            <option value="">Tous</option>
            {EVENT_TYPE_CODES.map((code) => (
              <option key={code} value={code}>
                {EVENT_TYPE_LABELS[code]}
              </option>
            ))}
          </select>
        </label>
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
