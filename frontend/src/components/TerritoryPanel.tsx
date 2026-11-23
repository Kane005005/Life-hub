import { Link } from 'react-router-dom'
import type { CssVars } from '../lib/css'
import { formatDate } from '../lib/format'
import { STATE_LABELS, TERRITORY_BY_CODE } from '../lib/labels'
import { useTerritory } from '../lib/queries'
import type { TerritoryStat } from '../lib/types'
import { HudFrame } from './HudFrame'

type TerritoryPanelProps = {
  territory: TerritoryStat
}

export function TerritoryPanel({ territory }: TerritoryPanelProps) {
  const { data, isPending, isError } = useTerritory(territory.id)
  const link = TERRITORY_BY_CODE[territory.code]
  const panelStyle: CssVars = { '--c': territory.color }
  const quests = data?.quests ?? []

  return (
    <HudFrame style={panelStyle} className="lr-detail" aria-live="polite">
      <svg
        className="lr-detail-glyph"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: link.glyph }}
      />
      <div>
        <p className="lr-detail-code">
          {link.statCode} · {STATE_LABELS[territory.state]}
        </p>
        <h4>{territory.name}</h4>
        <p className="lr-detail-en">{territory.english}</p>
      </div>
      <p>{territory.domain}</p>
      <p className="lr-detail-place">{territory.place}</p>

      <div className="lr-detail-stat">
        <span>Stat</span>
        <div className="lr-detail-bar">
          <i
            className="lr-detail-fill"
            style={{ transform: `scaleX(${territory.stat_display / 100})` }}
          />
        </div>
        <span className="num">{territory.stat_display} / 100</span>
      </div>
      <p className="lr-detail-xp">XP cumulé : {territory.total_xp}</p>

      <h3 className="lr-detail-subtitle">Missions actives</h3>
      <ul className="lr-detail-quests" aria-live="polite">
        {quests.length > 0 ? (
          quests.map((quest) => (
            <li key={quest.id}>
              <span>{quest.title}</span>
              <span className="lr-xp">+{quest.xp_reward} XP</span>
              {quest.due_date ? (
                <span className="lr-detail-due">Échéance {formatDate(quest.due_date)}</span>
              ) : null}
            </li>
          ))
        ) : (
          <li>
            {isPending
              ? 'Chargement des missions…'
              : isError
                ? 'Missions indisponibles.'
                : 'Aucune mission active.'}
          </li>
        )}
      </ul>
      <Link className="lr-q-menu" to={`/heros?arbre=${territory.code}#competences`}>
        Voir l'arbre de compétences
      </Link>
    </HudFrame>
  )
}
