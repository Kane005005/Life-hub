import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeCharacter, makeSkillTree } from '../test/fixtures'
import { TestProviders } from '../test/TestProviders'
import { HeroPage } from './HeroPage'

function jsonResponse(status: number, body?: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('HeroPage', () => {
  it('affiche les succès et synchronise le sélecteur d’arbre avec l’URL', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/character/') return Promise.resolve(jsonResponse(200, makeCharacter()))
      if (url === '/api/progression/history/')
        return Promise.resolve(
          jsonResponse(200, { count: 0, next: null, previous: null, results: [] }),
        )
      if (url === '/api/achievements/') {
        return Promise.resolve(
          jsonResponse(200, [
            {
              code: 'FIRST_QUEST',
              name: 'First Quest',
              label: 'Premier pas',
              description: 'Valider une première mission.',
              unlocked: true,
              unlocked_at: '2026-11-20T10:00:00Z',
            },
          ]),
        )
      }
      if (url.startsWith('/api/skills/trees/')) {
        return Promise.resolve(
          jsonResponse(200, [
            makeSkillTree({ territory: url.includes('TECHNOLOGY') ? 'TECHNOLOGY' : 'KNOWLEDGE' }),
          ]),
        )
      }
      return Promise.resolve(jsonResponse(200, {}))
    })
    vi.stubGlobal('fetch', fetchMock)

    render(
      <TestProviders initialEntries={['/heros']}>
        <HeroPage />
      </TestProviders>,
    )

    expect(await screen.findByText('Premier pas')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Technologie' }))

    await waitFor(() => {
      expect(screen.getByTestId('location-search')).toHaveTextContent('arbre=TECHNOLOGY')
    })
  })
})
