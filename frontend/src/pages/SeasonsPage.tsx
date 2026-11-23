import { useState } from 'react'
import '../styles/seasons.css'
import { Button } from '../components/Button'
import { HudFrame } from '../components/HudFrame'
import { SeasonCard } from '../components/SeasonCard'
import { SeasonForm } from '../components/SeasonForm'
import { useFx } from '../features/fx/useFx'
import { ApiError } from '../lib/api'
import { formatDate } from '../lib/format'
import { useCloseSeason, useCurrentSeason, useSeasons } from '../lib/queries'

export function SeasonsPage() {
  const currentQuery = useCurrentSeason()
  const seasonsQuery = useSeasons()
  const closeSeason = useCloseSeason()
  const { announce } = useFx()
  const [editing, setEditing] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const [error, setError] = useState('')

  const current = currentQuery.data
  const past = (seasonsQuery.data?.results ?? []).filter((season) => season.status === 'CLOSED')

  async function handleClose() {
    if (!current) return
    setError('')
    try {
      await closeSeason.mutateAsync(current.id)
      setConfirmClose(false)
      announce('Saison clôturée. La suivante commence aujourd’hui.')
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.detail : 'Clôture impossible.')
    }
  }

  return (
    <section className="lr-section lr-seasons-page">
      <p className="lr-eyebrow">06 · Saisons</p>
      <h1 className="lr-title">Saisons</h1>
      <p className="lr-lede">Des cycles de 90 jours pour donner un cap à ta progression.</p>

      {currentQuery.isPending ? <p className="lr-note">Chargement de la saison…</p> : null}

      {current ? (
        <div className="lr-stack lr-seasons-active">
          <SeasonCard season={current} featured />
          <div className="lr-form-actions">
            <Button variant="quiet" onClick={() => setEditing((value) => !value)}>
              Modifier
            </Button>
            <Button variant="quiet" onClick={() => setConfirmClose(true)}>
              Clôturer maintenant
            </Button>
          </div>
          {editing ? (
            <SeasonForm
              season={current}
              onSaved={() => setEditing(false)}
              onCancel={() => setEditing(false)}
            />
          ) : null}
          {confirmClose ? (
            <HudFrame
              role="dialog"
              aria-modal="true"
              aria-label="Clôturer la saison ?"
              className="lr-stack"
            >
              <p>Clôturer la saison ? Son bilan sera figé et la suivante commencera aujourd'hui.</p>
              {error ? (
                <p role="alert" className="lr-field-error">
                  {error}
                </p>
              ) : null}
              <div className="lr-form-actions">
                <Button variant="quiet" onClick={() => setConfirmClose(false)}>
                  Annuler
                </Button>
                <Button
                  variant="solid"
                  disabled={closeSeason.isPending}
                  onClick={() => void handleClose()}
                >
                  Clôturer
                </Button>
              </div>
            </HudFrame>
          ) : null}
        </div>
      ) : !currentQuery.isPending ? (
        <div className="lr-stack">
          <HudFrame className="lr-season-empty">
            <p className="lr-eyebrow">Aucune saison active</p>
            <p>Aucune saison en cours. Une saison dure 90 jours.</p>
          </HudFrame>
          <SeasonForm />
        </div>
      ) : null}

      <h2 className="lr-subtitle">Saisons passées</h2>
      <div className="lr-stack">
        {past.map((season) => (
          <details key={season.id} className="lr-season-past">
            <summary className="lr-season-summary-toggle">
              <span className="lr-season-past-number">Saison {season.number}</span>
              <span className="lr-season-past-name">{season.name}</span>
              <span className="lr-note">
                {formatDate(season.start_date)} → {formatDate(season.end_date)}
              </span>
            </summary>
            <div className="lr-season-past-body">
              <SeasonCard season={season} />
            </div>
          </details>
        ))}
        {!seasonsQuery.isPending && past.length === 0 ? (
          <p className="lr-empty">Aucune saison passée.</p>
        ) : null}
      </div>
    </section>
  )
}
