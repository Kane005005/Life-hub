import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AgentTokenForm } from '../components/AgentTokenForm'
import { AgentTokenList } from '../components/AgentTokenList'
import { SoundToggle } from '../components/SoundToggle'
import { useSound } from '../features/fx/useSound'
import { downloadExport, useLogout } from '../lib/queries'

export function SettingsPage() {
  const navigate = useNavigate()
  const logout = useLogout()
  const { enabled, toggle } = useSound()
  const [exportMessage, setExportMessage] = useState('')

  async function handleExport() {
    setExportMessage('')
    try {
      await downloadExport()
      setExportMessage('Export téléchargé.')
    } catch {
      setExportMessage('Export impossible pour le moment.')
    }
  }

  async function handleLogout() {
    try {
      await logout.mutateAsync()
    } catch {
      // La sortie locale suffit, même si le serveur ne répond pas.
    } finally {
      navigate('/connexion', { replace: true })
    }
  }

  return (
    <section className="lr-section">
      <p className="lr-eyebrow">08 · Réglages</p>
      <h1 className="lr-title">Réglages</h1>

      <div className="lr-settings">
        <section className="lr-settings-section" aria-label="Agents">
          <h2 className="lr-subtitle">Agents</h2>
          <p className="lr-lede">
            Chaque agent reçoit son jeton. Toi seul décides des portées et des missions acceptées.
          </p>
          <AgentTokenForm />
          <AgentTokenList />
          <p className="lr-doc-note">Voir docs/AGENTS.md dans le dépôt</p>
        </section>

        <section className="lr-settings-section" aria-label="Son">
          <h2 className="lr-subtitle">Son</h2>
          <p className="lr-lede">
            Le son est coupé au départ. Ce réglage suit la barre supérieure.
          </p>
          <SoundToggle enabled={enabled} onToggle={toggle} />
        </section>

        <section className="lr-settings-section" aria-label="Sauvegarde">
          <h2 className="lr-subtitle">Sauvegarde</h2>
          <p>
            {'Lance make backup dans le dossier du projet. ' +
              "Chaque sauvegarde est datée et n'efface jamais les précédentes."}
          </p>
          <pre className="lr-code-block">
            <code>make backup</code>
          </pre>
        </section>

        <section className="lr-settings-section" aria-label="Export">
          <h2 className="lr-subtitle">Export</h2>
          <p className="lr-lede">Toutes tes données, dans un fichier JSON.</p>
          <button type="button" className="lr-btn" onClick={() => void handleExport()}>
            Télécharger mes données
          </button>
          <p className="lr-note" role="status" aria-live="polite">
            {exportMessage}
          </p>
        </section>

        <section className="lr-settings-section" aria-label="Compte">
          <h2 className="lr-subtitle">Compte</h2>
          <button
            type="button"
            className="lr-btn lr-btn--quiet"
            onClick={() => void handleLogout()}
          >
            Quitter
          </button>
        </section>
      </div>
    </section>
  )
}
