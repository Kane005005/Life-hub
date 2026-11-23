import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AgentTokenForm } from '../components/AgentTokenForm'
import { AgentTokenList } from '../components/AgentTokenList'
import { Button } from '../components/Button'
import { SoundToggle } from '../components/SoundToggle'
import { useSound } from '../features/fx/useSound'
import { ApiError } from '../lib/api'
import { downloadExport, useMe, useLogout, useUpdateTimeZone } from '../lib/queries'

const FALLBACK_ZONES = [
  'Africa/Bamako',
  'Europe/Paris',
  'Europe/London',
  'UTC',
  'America/New_York',
  'Asia/Tokyo',
]

function availableZones(current: string): string[] {
  const supported = (
    Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] }
  ).supportedValuesOf?.('timeZone')
  const zones = Array.isArray(supported) && supported.length > 0 ? supported : FALLBACK_ZONES
  return zones.includes(current) ? zones : [current, ...zones]
}

function TimeZoneSettings() {
  const me = useMe()
  const update = useUpdateTimeZone()
  const [value, setValue] = useState('Africa/Bamako')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const current = me.data?.time_zone ?? 'Africa/Bamako'
  const zones = useMemo(() => availableZones(current), [current])

  useEffect(() => {
    setValue(current)
  }, [current])

  async function handleSave() {
    setMessage('')
    setError('')
    try {
      await update.mutateAsync(value)
      setMessage('Fuseau horaire enregistré.')
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.detail : 'Enregistrement impossible.')
    }
  }

  return (
    <section className="lr-settings-section" aria-label="Fuseau horaire">
      <h2 className="lr-subtitle">Fuseau horaire</h2>
      <p className="lr-field-help">Ton jour commence à minuit dans ce fuseau.</p>
      <label className="lr-field">
        <span>Fuseau horaire</span>
        <select value={value} onChange={(event) => setValue(event.target.value)}>
          {zones.map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </select>
      </label>
      <Button onClick={() => void handleSave()} disabled={update.isPending}>
        Enregistrer
      </Button>
      {message ? (
        <p className="lr-note" role="status" aria-live="polite">
          {message}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="lr-field-error">
          {error}
        </p>
      ) : null}
    </section>
  )
}

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
        <TimeZoneSettings />

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
