import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { QuestCard } from '../components/QuestCard'
import { RestButton } from '../components/RestButton'
import { HudFrame } from '../components/HudFrame'
import { TerritoryPanel } from '../components/TerritoryPanel'
import { WorldMap } from '../components/WorldMap'
import { useHealth } from '../lib/api'
import { useCurrentSeason, useQuests, useTerritories } from '../lib/queries'
import type { TerritoryCode, TerritoryStat } from '../lib/types'

function defaultTerritory(territories: TerritoryStat[]): TerritoryStat | undefined {
  return [...territories].sort((a, b) => b.active_quests - a.active_quests)[0]
}

export function WorldPage() {
  const territoriesQuery = useTerritories()
  const todayQuery = useQuests({ today: true })
  const currentSeasonQuery = useCurrentSeason()
  const health = useHealth()
  const [chosen, setChosen] = useState<TerritoryCode | null>(null)

  const territories = useMemo(() => territoriesQuery.data ?? [], [territoriesQuery.data])
  const selected = useMemo(
    () => territories.find((item) => item.code === chosen) ?? defaultTerritory(territories),
    [territories, chosen],
  )
  const todayQuests = todayQuery.data?.results ?? []
  const currentSeason = currentSeasonQuery.data
  const mainObjective = currentSeason?.objectives?.find((objective) => objective.is_main)

  return (
    <section className="lr-section">
      <p className="lr-eyebrow">01 · Le monde</p>
      <h1 className="lr-title">Ta carte</h1>
      <p className="lr-lede">Choisis un territoire. Le monde se dévoile à ton rythme.</p>

      {currentSeason ? (
        <HudFrame className="lr-season-banner">
          <div>
            <p className="lr-detail-code">Saison en cours</p>
            <p className="lr-q-title">{currentSeason.name}</p>
            <p className="lr-note">
              <span className="num">{currentSeason.days_left}</span> jours restants
              {mainObjective ? ` · ${mainObjective.title}` : ''}
            </p>
          </div>
          <Link className="lr-q-menu" to="/saisons">
            Voir la saison
          </Link>
        </HudFrame>
      ) : null}

      {territoriesQuery.isPending ? <p className="lr-note">Chargement de la carte…</p> : null}
      {territoriesQuery.isError ? (
        <p role="alert" className="lr-note">
          Carte indisponible pour le moment.
        </p>
      ) : null}

      {selected ? (
        <div className="lr-world">
          <HudFrame className="lr-map">
            <WorldMap territories={territories} selected={selected.code} onSelect={setChosen} />
          </HudFrame>
          <TerritoryPanel territory={selected} />
        </div>
      ) : null}

      <h2 className="lr-subtitle">Missions du jour</h2>
      {todayQuery.isPending ? <p className="lr-note">Chargement des missions…</p> : null}
      {todayQuests.length > 0 ? (
        <div className="lr-log">
          {todayQuests.map((quest) => (
            <QuestCard key={quest.id} quest={quest} />
          ))}
        </div>
      ) : (
        !todayQuery.isPending && (
          <div className="lr-empty">
            <p>Aucune mission pour aujourd'hui. Crée-en une ou repose-toi.</p>
            <RestButton />
          </div>
        )
      )}

      <p className="lr-note lr-world-health" aria-live="polite">
        Serveur : {health.isPending ? 'vérification…' : (health.data?.status ?? 'indisponible')}
      </p>
    </section>
  )
}
