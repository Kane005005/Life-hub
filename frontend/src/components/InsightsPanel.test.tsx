import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Insights } from '../lib/types'
import { makeInsights } from '../test/fixtures'
import { TestProviders } from '../test/TestProviders'
import { InsightsPanel } from './InsightsPanel'

function mockApi(insights: Insights) {
  const fetchMock = vi.fn().mockImplementation((url: string) => {
    if (url === '/api/analytics/insights/') {
      return Promise.resolve({ ok: true, status: 200, json: async () => insights })
    }
    return Promise.resolve({ ok: true, status: 200, json: async () => ({}) })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('InsightsPanel', () => {
  it('affiche un message calme quand il n’y a rien à signaler', async () => {
    mockApi(
      makeInsights({
        load: { active_quests: 2, hard_quests: 0, overdue: 0 },
        neglected_territories: [],
        suggestions: [],
      }),
    )

    render(
      <TestProviders>
        <InsightsPanel />
      </TestProviders>,
    )

    expect(await screen.findByText('Rien à signaler. Ton équilibre tient.')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('présente charge, territoires et suggestions sans rien modifier', async () => {
    mockApi(makeInsights())

    render(
      <TestProviders>
        <InsightsPanel />
      </TestProviders>,
    )

    expect(
      await screen.findByText(/6 missions actives, 3 difficiles, 1 en retard/),
    ).toBeInTheDocument()
    expect(screen.getByText('Création')).toBeInTheDocument()
    expect(screen.getByText('aucun XP depuis 21 jours')).toBeInTheDocument()
    expect(screen.getByText('Récupération')).toBeInTheDocument()
    expect(screen.getByText(/Énergie faible et 3 missions difficiles/)).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
