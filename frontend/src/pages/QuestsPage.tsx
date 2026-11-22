import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '../components/Button'
import { QuestCard } from '../components/QuestCard'
import { QuestForm } from '../components/QuestForm'
import { RestButton } from '../components/RestButton'
import { apiGet } from '../lib/api'
import {
  DIFFICULTY_CODES,
  DIFFICULTY_LABELS,
  QUEST_TYPE_CODES,
  QUEST_TYPE_LABELS,
  TERRITORY_CODES,
  TERRITORY_LABELS,
} from '../lib/labels'
import { nextApiPath } from '../lib/pagination'
import { useQuests } from '../lib/queries'
import type {
  Difficulty,
  Paginated,
  Quest,
  QuestFilters,
  QuestStatus,
  QuestType,
  TerritoryCode,
} from '../lib/types'

type StatusView = 'ACTIVE' | 'COMPLETED' | 'ABANDONED' | 'ALL'

const ACTIVE_STATUSES: QuestStatus[] = ['AVAILABLE', 'ACCEPTED', 'IN_PROGRESS', 'PAUSED']

function readStatus(value: string | null): StatusView {
  return value === 'COMPLETED' || value === 'ABANDONED' || value === 'ALL' ? value : 'ACTIVE'
}

function statusFilter(view: StatusView): QuestStatus[] | undefined {
  if (view === 'ACTIVE') {
    return ACTIVE_STATUSES
  }
  if (view === 'ALL') {
    return undefined
  }
  return [view]
}

export function QuestsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [formOpen, setFormOpen] = useState(false)
  const [extra, setExtra] = useState<Quest[]>([])
  const [message, setMessage] = useState('')

  const territory = (searchParams.get('territory') ?? '') as TerritoryCode | ''
  const questType = (searchParams.get('quest_type') ?? '') as QuestType | ''
  const difficulty = (searchParams.get('difficulty') ?? '') as Difficulty | ''
  const statusView = readStatus(searchParams.get('status'))

  const filters: QuestFilters = useMemo(
    () => ({
      territory: territory || undefined,
      quest_type: questType || undefined,
      difficulty: difficulty || undefined,
      status: statusFilter(statusView),
    }),
    [territory, questType, difficulty, statusView],
  )

  const questsQuery = useQuests(filters)
  const firstPage = questsQuery.data
  const filterKey = searchParams.toString()
  const next = extra.length > 0 ? undefined : firstPage?.next

  useEffect(() => {
    setExtra([])
    setMessage('')
  }, [filterKey])

  function changeFilter(key: string, value: string) {
    const nextParams = new URLSearchParams(searchParams)
    if (value === '') {
      nextParams.delete(key)
    } else {
      nextParams.set(key, value)
    }
    setSearchParams(nextParams, { replace: true })
  }

  async function loadMore() {
    if (!firstPage?.next) {
      return
    }
    try {
      const page = await apiGet<Paginated<Quest>>(nextApiPath(firstPage.next))
      setExtra(page.results)
      setMessage(`${page.results.length} mission(s) supplémentaire(s).`)
    } catch {
      setMessage('Chargement impossible pour le moment.')
    }
  }

  const quests = [...(firstPage?.results ?? []), ...extra].sort((a, b) => {
    if (a.quest_type === 'BOSS' && b.quest_type !== 'BOSS') {
      return 1
    }
    if (a.quest_type !== 'BOSS' && b.quest_type === 'BOSS') {
      return -1
    }
    return b.id - a.id
  })

  return (
    <section className="lr-section">
      <p className="lr-eyebrow">03 · Missions</p>
      <div className="lr-page-head">
        <h1 className="lr-title">Missions</h1>
        <Button variant="solid" onClick={() => setFormOpen((value) => !value)}>
          Nouvelle mission
        </Button>
      </div>

      {formOpen ? (
        <QuestForm
          onCancel={() => setFormOpen(false)}
          onCreated={() => {
            setFormOpen(false)
            setMessage('Mission créée.')
          }}
        />
      ) : null}

      <div className="lr-filters" role="group" aria-label="Filtrer les missions">
        <label className="lr-field">
          <span>Territoire</span>
          <select
            value={territory}
            onChange={(event) => changeFilter('territory', event.target.value)}
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
          <span>Type</span>
          <select
            value={questType}
            onChange={(event) => changeFilter('quest_type', event.target.value)}
          >
            <option value="">Tous</option>
            {QUEST_TYPE_CODES.map((code) => (
              <option key={code} value={code}>
                {QUEST_TYPE_LABELS[code]}
              </option>
            ))}
          </select>
        </label>

        <label className="lr-field">
          <span>Difficulté</span>
          <select
            value={difficulty}
            onChange={(event) => changeFilter('difficulty', event.target.value)}
          >
            <option value="">Toutes</option>
            {DIFFICULTY_CODES.map((code) => (
              <option key={code} value={code}>
                {DIFFICULTY_LABELS[code]}
              </option>
            ))}
          </select>
        </label>

        <label className="lr-field">
          <span>Statut</span>
          <select
            value={statusView}
            onChange={(event) => changeFilter('status', event.target.value)}
          >
            <option value="ACTIVE">En cours</option>
            <option value="COMPLETED">Terminées</option>
            <option value="ABANDONED">Abandonnées</option>
            <option value="ALL">Toutes</option>
          </select>
        </label>
      </div>

      {questsQuery.isPending ? <p className="lr-note">Chargement des missions…</p> : null}
      {questsQuery.isError ? (
        <p role="alert" className="lr-note">
          Missions indisponibles pour le moment.
        </p>
      ) : null}
      {!questsQuery.isPending && quests.length === 0 ? (
        <p className="lr-note">Aucune mission dans cette vue.</p>
      ) : null}

      {quests.length > 0 ? (
        <div className="lr-log">
          {quests.map((quest) => (
            <QuestCard key={quest.id} quest={quest} />
          ))}
        </div>
      ) : null}

      <div className="lr-logbar">
        {next ? (
          <Button variant="quiet" onClick={() => void loadMore()}>
            Charger plus
          </Button>
        ) : null}
        <RestButton />
      </div>
      <p className="lr-note" aria-live="polite">
        {message}
      </p>
    </section>
  )
}
