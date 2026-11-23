import type { CssVars } from '../lib/css'
import { INSIGHT_KIND_LABELS, TERRITORY_BY_CODE, TERRITORY_LABELS } from '../lib/labels'
import { useInsights } from '../lib/queries'
import { HudFrame } from './HudFrame'

export function InsightsPanel() {
  const insights = useInsights()
  const data = insights.data
  const load = data?.load
  const neglected = data?.neglected_territories ?? []
  const suggestions = data?.suggestions ?? []
  const isEmpty = suggestions.length === 0 && neglected.length === 0 && (load?.overdue ?? 0) === 0

  return (
    <HudFrame as="section" className="lr-insights" aria-label="Analyse de ta progression">
      <h2 className="lr-card-title">Lecture de ta progression</h2>

      {insights.isPending ? <p className="lr-note">Analyse en cours…</p> : null}
      {insights.isError ? (
        <p role="alert" className="lr-note">
          Analyse indisponible pour le moment.
        </p>
      ) : null}

      {data && isEmpty ? (
        <p className="lr-insights-empty">Rien à signaler. Ton équilibre tient.</p>
      ) : null}

      {data && !isEmpty ? (
        <div className="lr-insights-body">
          {load ? (
            <p className="lr-insights-load">
              {load.active_quests} missions actives, {load.hard_quests} difficiles, {load.overdue}{' '}
              en retard.
            </p>
          ) : null}

          {neglected.length > 0 ? (
            <div className="lr-insights-group">
              <h3 className="lr-insights-subtitle">Territoires négligés</h3>
              <ul className="lr-insights-list">
                {neglected.map((item) => {
                  const style: CssVars = {
                    '--c': TERRITORY_BY_CODE[item.code]?.color ?? '#93A19A',
                  }
                  return (
                    <li key={item.code} style={style}>
                      <span className="lr-pill lr-pill--territory">
                        {TERRITORY_LABELS[item.code] ?? item.code}
                      </span>
                      <span>depuis {item.days_since_xp} jours</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : null}

          {suggestions.length > 0 ? (
            <div className="lr-insights-group">
              <h3 className="lr-insights-subtitle">Suggestions</h3>
              <ul className="lr-insights-list">
                {suggestions.map((item, index) => (
                  <li key={`${item.kind}-${index}`}>
                    <span className="lr-pill">{INSIGHT_KIND_LABELS[item.kind]}</span>
                    <p>{item.message}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </HudFrame>
  )
}
