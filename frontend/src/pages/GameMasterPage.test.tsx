import { render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Insights, QuestProposal } from '../lib/types'
import { makeEnergyCheckIn, makeInsights, makeProposal } from '../test/fixtures'
import { TestProviders } from '../test/TestProviders'
import { GameMasterPage } from './GameMasterPage'

function paginated<T>(results: T[]) {
  return { count: results.length, next: null, previous: null, results }
}

function mockApi(proposals: QuestProposal[], insights: Insights = makeInsights()) {
  const fetchMock = vi.fn().mockImplementation((url: string) => {
    if (url === '/api/quest-proposals/') {
      return Promise.resolve({ ok: true, status: 200, json: async () => paginated(proposals) })
    }
    if (url === '/api/energy/') {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => paginated([makeEnergyCheckIn()]),
      })
    }
    if (url === '/api/analytics/insights/') {
      return Promise.resolve({ ok: true, status: 200, json: async () => insights })
    }
    return Promise.resolve({ ok: true, status: 200, json: async () => [] })
  })
  vi.stubGlobal('fetch', fetchMock)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('GameMasterPage', () => {
  it('regroupe les propositions par agent et garde l’historique à part', async () => {
    mockApi([
      makeProposal({ id: 7, title: 'Lire 20 pages' }),
      makeProposal({ id: 8, title: 'Ranger le bureau' }),
      makeProposal({ id: 9, title: 'Écrire ce soir' }),
      makeProposal({ id: 10, title: 'Ancienne idée', status: 'REJECTED' }),
    ])

    render(
      <TestProviders>
        <GameMasterPage />
      </TestProviders>,
    )

    expect(screen.getByText('04 · Game Master')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Game Master', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('Tes agents proposent. Toi seul décides.')).toBeInTheDocument()
    expect(
      await screen.findByText(
        'Claude Code propose 3 missions. Accepte, modifie ou refuse chacune.',
      ),
    ).toBeInTheDocument()

    expect(screen.getByText('Lire 20 pages')).toBeInTheDocument()
    expect(screen.getByText('Ranger le bureau')).toBeInTheDocument()
    expect(screen.getByText('Écrire ce soir')).toBeInTheDocument()
    expect(screen.getByText('Historique')).toBeInTheDocument()

    const sidebar = screen.getByRole('complementary', { name: 'Bilan et analyse' })
    expect(within(sidebar).getByText('Bilan énergétique')).toBeInTheDocument()
    expect(within(sidebar).getByText('Lecture de ta progression')).toBeInTheDocument()
  })

  it('invite à connecter un agent quand aucune proposition n’est en attente', async () => {
    mockApi([makeProposal({ id: 11, title: 'Déjà traitée', status: 'ACCEPTED' })])

    render(
      <TestProviders>
        <GameMasterPage />
      </TestProviders>,
    )

    expect(
      await screen.findByText(
        (_, element) =>
          element?.tagName === 'P' &&
          element.textContent ===
            'Aucune proposition en attente. Connecte un agent dans Réglages pour en recevoir.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Réglages' })).toHaveAttribute('href', '/reglages')
  })
})
