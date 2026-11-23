import { useState } from 'react'
import type { FormEvent } from 'react'
import { useFx } from '../features/fx/useFx'
import { ApiError } from '../lib/api'
import {
  AGENT_SCOPE_CODES,
  AGENT_SCOPE_DESCRIPTIONS,
  AGENT_SCOPE_LABELS,
  DEFAULT_AGENT_SCOPES,
} from '../lib/labels'
import { useCreateAgentToken } from '../lib/queries'
import type { AgentScope } from '../lib/types'
import { Button } from './Button'
import { HudFrame } from './HudFrame'

export function AgentTokenForm() {
  const create = useCreateAgentToken()
  const { announce, toast } = useFx()
  const [name, setName] = useState('')
  const [scopes, setScopes] = useState<AgentScope[]>(() => [...DEFAULT_AGENT_SCOPES])
  const [secret, setSecret] = useState<string | null>(null)
  const [error, setError] = useState('')

  function toggleScope(scope: AgentScope) {
    setScopes((current) =>
      current.includes(scope) ? current.filter((item) => item !== scope) : [...current, scope],
    )
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (!name.trim()) {
      return
    }
    try {
      const created = await create.mutateAsync({ name: name.trim(), scopes })
      setSecret(created.token ?? null)
      setName('')
      setScopes([...DEFAULT_AGENT_SCOPES])
      const message = 'Jeton créé. Copie-le maintenant.'
      announce(message)
      toast(message)
    } catch (cause) {
      const detail = cause instanceof ApiError ? cause.detail : 'Création impossible.'
      setError(detail)
      announce(detail)
    }
  }

  async function handleCopy() {
    if (!secret) {
      return
    }
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(secret)
        announce('Jeton copié.')
      } else {
        announce('Sélectionne le jeton pour le copier.')
      }
    } catch {
      announce('Copie impossible. Sélectionne le jeton pour le copier.')
    }
  }

  return (
    <div className="lr-token-form-wrap">
      <HudFrame as="form" className="lr-token-form" onSubmit={handleSubmit}>
        <h3 className="lr-form-title">Nouvel agent</h3>

        <label className="lr-field">
          <span>Nom de l’agent</span>
          <input
            type="text"
            name="name"
            required
            maxLength={60}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        <fieldset className="lr-fieldset">
          <legend>Portées</legend>
          <div className="lr-scope-grid">
            {AGENT_SCOPE_CODES.map((scope) => (
              <label className="lr-choice lr-choice--scope" key={scope}>
                <input
                  type="checkbox"
                  checked={scopes.includes(scope)}
                  onChange={() => toggleScope(scope)}
                />
                <span>{AGENT_SCOPE_LABELS[scope]}</span>
                <small>{AGENT_SCOPE_DESCRIPTIONS[scope]}</small>
              </label>
            ))}
          </div>
        </fieldset>

        {error ? (
          <p role="alert" className="lr-field-error">
            {error}
          </p>
        ) : null}

        <Button type="submit" variant="solid" disabled={create.isPending}>
          Créer le jeton
        </Button>
      </HudFrame>

      {secret ? (
        <HudFrame as="section" className="lr-secret" aria-label="Secret du jeton">
          <p className="lr-secret-warning">
            Ce jeton ne sera plus jamais affiché. Copie-le maintenant.
          </p>
          <code className="lr-secret-value">{secret}</code>
          <div className="lr-form-actions">
            <Button onClick={() => void handleCopy()}>Copier</Button>
            <Button variant="quiet" onClick={() => setSecret(null)}>
              Fermer
            </Button>
          </div>
        </HudFrame>
      ) : null}
    </div>
  )
}
