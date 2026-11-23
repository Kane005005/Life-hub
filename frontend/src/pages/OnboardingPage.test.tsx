import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Character } from '../lib/types'
import { OnboardingPage } from './OnboardingPage'

const character: Character = {
  pseudonym: 'Kane',
  bio: '',
  character_class: 'ARCHITECT',
  is_onboarded: false,
  level: 1,
  xp_in_level: 0,
  xp_required: 100,
  total_xp: 0,
  rank: { code: 'INITIATE', label: 'Initié' },
  credits: 0,
  skill_points: { available: 0, spent: 0 },
  avatar: { silhouette: 'A', color: '#2FD08B', accent: '#EDE9DF' },
  stats: [],
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('OnboardingPage', () => {
  it('envoie les deux PATCH avec les valeurs choisies', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => character,
    })
    vi.stubGlobal('fetch', fetchMock)

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <OnboardingPage character={character} />
      </QueryClientProvider>,
    )

    await user.clear(screen.getByLabelText('Pseudonyme'))
    await user.type(screen.getByLabelText('Pseudonyme'), 'Nara')
    await user.type(screen.getByLabelText('Biographie'), 'J’aime les longues marches.')
    await user.click(screen.getByLabelText('Créateur'))
    await user.click(screen.getByLabelText('Silhouette B'))
    await user.click(screen.getByLabelText('Couleur #D0A94A'))
    await user.click(screen.getByRole('button', { name: 'Créer mon personnage' }))

    await waitFor(() => {
      const urls = fetchMock.mock.calls.map((call) => call[0])
      expect(urls).toContain('/api/character/avatar/')
      expect(urls).toContain('/api/character/')
    })

    const avatarCall = fetchMock.mock.calls.find((call) => call[0] === '/api/character/avatar/')
    const characterCall = fetchMock.mock.calls.find(
      (call) => call[0] === '/api/character/' && (call[1] as RequestInit).method === 'PATCH',
    )
    expect(JSON.parse((avatarCall?.[1] as RequestInit).body as string)).toEqual({
      silhouette: 'B',
      color: '#D0A94A',
      accent: '#EDE9DF',
    })
    expect(JSON.parse((characterCall?.[1] as RequestInit).body as string)).toEqual({
      pseudonym: 'Nara',
      bio: 'J’aime les longues marches.',
      character_class: 'CREATOR',
      is_onboarded: true,
    })
  })
})
