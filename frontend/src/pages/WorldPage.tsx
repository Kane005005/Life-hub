import { Button } from '../components/Button'
import { HudFrame } from '../components/HudFrame'
import { XpGauge } from '../components/XpGauge'
import { PLACEHOLDER_PROGRESS } from '../app/placeholder'
import { useHealth } from '../lib/api'

export function WorldPage() {
  const { data, isPending, isError } = useHealth()

  let serverStatus = 'Serveur local : connecté.'
  if (isPending) {
    serverStatus = 'Connexion au serveur local…'
  } else if (isError || data?.status !== 'ok') {
    serverStatus = "Serveur local injoignable. Vérifie qu'il tourne, puis relance."
  }

  return (
    <section className="lr-section">
      <p className="lr-eyebrow">01 · Le monde</p>
      <h1 className="lr-title">Ta carte se prépare</h1>

      <HudFrame className="lr-world-panel">
        <XpGauge
          level={PLACEHOLDER_PROGRESS.level}
          xp={PLACEHOLDER_PROGRESS.xp}
          xpRequired={PLACEHOLDER_PROGRESS.xpRequired}
          variant="full"
        />
        <p className="lr-server-status" aria-live="polite">
          {serverStatus}
        </p>
      </HudFrame>

      <div className="lr-world-actions">
        <Button variant="solid" disabled>
          Entrer dans le monde
        </Button>
        <span className="lr-note">Disponible en phase 1.</span>
      </div>
    </section>
  )
}
