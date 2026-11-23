import { Link } from 'react-router-dom'
import { EnergyCheckIn } from '../components/EnergyCheckIn'
import { InsightsPanel } from '../components/InsightsPanel'
import { ProposalCard } from '../components/ProposalCard'
import { useProposals } from '../lib/queries'
import type { QuestProposal } from '../lib/types'

function groupByAgent(proposals: QuestProposal[]): [string, number][] {
  const counts = new Map<string, number>()
  proposals.forEach((proposal) => {
    counts.set(proposal.agent_name, (counts.get(proposal.agent_name) ?? 0) + 1)
  })
  return Array.from(counts.entries())
}

export function GameMasterPage() {
  const proposals = useProposals()
  const all = proposals.data?.results ?? []
  const pending = all.filter((item) => item.status === 'PENDING')
  const decided = all.filter((item) => item.status !== 'PENDING')
  const groups = groupByAgent(pending)

  return (
    <section className="lr-section">
      <p className="lr-eyebrow">04 · Game Master</p>
      <h1 className="lr-title">Game Master</h1>
      <p className="lr-lede">Tes agents proposent. Toi seul décides.</p>

      <div className="lr-gm-layout">
        <div className="lr-gm-main">
          <div className="lr-gm-banner">
            <p className="lr-gm-count">
              {pending.length} proposition{pending.length > 1 ? 's' : ''} en attente
            </p>
            {groups.length > 0 ? (
              <ul className="lr-gm-agents">
                {groups.map(([agent, count]) => (
                  <li key={agent}>
                    {agent} propose {count} mission{count > 1 ? 's' : ''}. Accepte, modifie ou
                    refuse chacune.
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {proposals.isPending ? <p className="lr-note">Chargement des propositions…</p> : null}
          {proposals.isError ? (
            <p role="alert" className="lr-note">
              Propositions indisponibles pour le moment.
            </p>
          ) : null}

          {!proposals.isPending && pending.length === 0 ? (
            <div className="lr-empty lr-gm-empty">
              <p>
                Aucune proposition en attente. Connecte un agent dans{' '}
                <Link to="/reglages">Réglages</Link> pour en recevoir.
              </p>
            </div>
          ) : null}

          {pending.length > 0 ? (
            <div className="lr-log lr-gm-queue">
              {pending.map((proposal) => (
                <ProposalCard key={proposal.id} proposal={proposal} />
              ))}
            </div>
          ) : null}

          {decided.length > 0 ? (
            <details className="lr-gm-history">
              <summary>Historique</summary>
              <div className="lr-log">
                {decided.map((proposal) => (
                  <ProposalCard key={proposal.id} proposal={proposal} />
                ))}
              </div>
            </details>
          ) : null}
        </div>

        <aside className="lr-gm-side" aria-label="Bilan et analyse">
          <EnergyCheckIn />
          <InsightsPanel />
        </aside>
      </div>
    </section>
  )
}
