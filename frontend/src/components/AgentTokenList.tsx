import { useEffect, useRef, useState } from 'react'
import { useFx } from '../features/fx/useFx'
import { ApiError } from '../lib/api'
import { formatDateTime } from '../lib/format'
import { AGENT_SCOPE_LABELS } from '../lib/labels'
import { useAgentTokens, useRevokeAgentToken } from '../lib/queries'
import type { AgentToken } from '../lib/types'
import { Button } from './Button'
import { HudFrame } from './HudFrame'

type AgentTokenRowProps = {
  token: AgentToken
  revoking: boolean
  onRevoke: (id: number) => Promise<boolean>
}

function AgentTokenRow({ token, revoking, onRevoke }: AgentTokenRowProps) {
  const [confirming, setConfirming] = useState(false)
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!confirming) {
      return
    }
    cancelRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setConfirming(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [confirming])

  return (
    <li className="lr-token">
      <div className="lr-token-head">
        <h3 className="lr-token-name">{token.name}</h3>
        <span className="lr-pill">{token.is_active ? 'Actif' : 'Révocé'}</span>
      </div>
      <p className="lr-token-prefix">Préfixe : {token.prefix}</p>
      <div className="lr-q-meta">
        {token.scopes.map((scope) => (
          <span className="lr-pill" key={scope}>
            {AGENT_SCOPE_LABELS[scope]}
          </span>
        ))}
      </div>
      <p className="lr-token-dates">
        Créé le {formatDateTime(token.created_at)} ·{' '}
        {token.last_used_at
          ? `Dernière utilisation le ${formatDateTime(token.last_used_at)}`
          : 'Jamais utilisé'}
      </p>
      {token.is_active ? (
        <Button variant="quiet" onClick={() => setConfirming(true)} disabled={revoking}>
          Révoquer
        </Button>
      ) : null}

      {confirming ? (
        <div
          className="lr-q-dialog"
          role="dialog"
          aria-modal="true"
          aria-label="Révoquer ce jeton ?"
        >
          <p>Révoquer ce jeton ? L'agent perdra l'accès immédiatement.</p>
          <div className="lr-q-dialog-actions">
            <button
              ref={cancelRef}
              type="button"
              className="lr-btn lr-btn--quiet"
              onClick={() => setConfirming(false)}
            >
              Annuler
            </button>
            <Button
              variant="solid"
              disabled={revoking}
              onClick={() => {
                void onRevoke(token.id).then((ok) => {
                  if (ok) {
                    setConfirming(false)
                  }
                })
              }}
            >
              Révoquer
            </Button>
          </div>
        </div>
      ) : null}
    </li>
  )
}

export function AgentTokenList() {
  const tokens = useAgentTokens()
  const revoke = useRevokeAgentToken()
  const { announce } = useFx()

  async function handleRevoke(id: number): Promise<boolean> {
    try {
      await revoke.mutateAsync(id)
      announce('Jeton révoqué.')
      return true
    } catch (cause) {
      const detail = cause instanceof ApiError ? cause.detail : 'Révocation impossible.'
      announce(detail)
      return false
    }
  }

  return (
    <HudFrame as="section" className="lr-token-list" aria-label="Jetons des agents">
      <h3 className="lr-form-title">Agents connectés</h3>
      {tokens.isPending ? <p className="lr-note">Chargement des jetons…</p> : null}
      {tokens.isError ? (
        <p role="alert" className="lr-note">
          Jetons indisponibles pour le moment.
        </p>
      ) : null}
      {tokens.data && tokens.data.length === 0 ? (
        <p className="lr-note">Aucun jeton pour le moment.</p>
      ) : null}
      {tokens.data && tokens.data.length > 0 ? (
        <ul className="lr-token-items">
          {tokens.data.map((token) => (
            <AgentTokenRow
              key={token.id}
              token={token}
              revoking={revoke.isPending}
              onRevoke={handleRevoke}
            />
          ))}
        </ul>
      ) : null}
    </HudFrame>
  )
}
