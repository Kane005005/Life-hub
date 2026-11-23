import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeShopItem } from '../test/fixtures'
import { TestProviders } from '../test/TestProviders'
import { ShopPage } from './ShopPage'

function jsonResponse(status: number, body?: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body }
}

const character = {
  pseudonym: 'Kane',
  bio: '',
  character_class: 'ARCHITECT',
  is_onboarded: true,
  level: 2,
  xp_in_level: 20,
  xp_required: 100,
  total_xp: 120,
  rank: { code: 'INITIATE', label: 'Initié' },
  credits: 300,
  skill_points: { available: 1, spent: 0 },
  avatar: { silhouette: 'A', color: '#2FD08B', accent: '#EDE9DF' },
  stats: [],
  equipment: { AURA: null, FRAME: null, EMBLEM: null },
}

const reward = {
  id: 1,
  name: 'Un livre',
  description: 'Lire un roman',
  category: 'REWARD',
  slot: null,
  cost: 120,
  is_available: true,
  is_custom: true,
  visual: null,
  owned: false,
  equipped: false,
  purchases_count: 0,
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ShopPage', () => {
  it('navigue les onglets au clavier et gère achat refusé et création de récompense', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url === '/api/character/') return Promise.resolve(jsonResponse(200, character))
      if (url.startsWith('/api/economy/rewards/?category=REWARD')) {
        if (init?.method === 'POST') {
          return Promise.resolve(jsonResponse(201, { ...reward, id: 2, name: 'Pause café' }))
        }
        return Promise.resolve(jsonResponse(200, [reward]))
      }
      if (url.startsWith('/api/economy/rewards/?category=ARTIFACT'))
        return Promise.resolve(jsonResponse(200, []))
      if (url === '/api/economy/inventory/')
        return Promise.resolve(jsonResponse(200, { items: [], purchases: [] }))
      if (url === '/api/economy/transactions/')
        return Promise.resolve(
          jsonResponse(200, { count: 0, next: null, previous: null, results: [] }),
        )
      if (url === '/api/economy/rewards/1/purchase/') {
        return Promise.resolve(
          jsonResponse(400, { detail: 'Crédits insuffisants : il te manque 120 crédits.' }),
        )
      }
      return Promise.resolve(jsonResponse(200, {}))
    })
    vi.stubGlobal('fetch', fetchMock)

    render(
      <TestProviders>
        <ShopPage />
      </TestProviders>,
    )

    const tabs = await screen.findAllByRole('tab')
    tabs[0].focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Objets' })).toHaveFocus()

    await user.click(screen.getByRole('tab', { name: 'Récompenses' }))
    await screen.findByText('Un livre')
    await user.click(screen.getByRole('button', { name: 'Acheter' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Crédits insuffisants : il te manque 120 crédits.',
    )

    await user.click(screen.getByRole('button', { name: 'Nouvelle récompense' }))
    await user.type(screen.getByLabelText('Nom'), 'Pause café')
    await user.clear(screen.getByLabelText('Coût en crédits'))
    await user.type(screen.getByLabelText('Coût en crédits'), '50')
    await user.click(screen.getByRole('button', { name: 'Créer la récompense' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/economy/rewards/',
        expect.objectContaining({ method: 'POST' }),
      )
    })
  })

  it('regroupe les objets par emplacement et simule l’aperçu sans requête', async () => {
    const user = userEvent.setup()
    const artifacts = [
      makeShopItem({ id: 10, slot: 'AURA', visual: { color: '#2FD08B' } }),
      makeShopItem({ id: 11, name: 'Cadre argent', slot: 'FRAME', visual: { style: 'silver' } }),
      makeShopItem({ id: 12, name: 'Emblème LIFE', slot: 'EMBLEM', visual: { sign: '✦' } }),
    ]
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/character/') return Promise.resolve(jsonResponse(200, character))
      if (url.startsWith('/api/economy/rewards/?category=REWARD')) {
        return Promise.resolve(jsonResponse(200, []))
      }
      if (url.startsWith('/api/economy/rewards/?category=ARTIFACT')) {
        return Promise.resolve(jsonResponse(200, artifacts))
      }
      if (url === '/api/economy/inventory/') {
        return Promise.resolve(jsonResponse(200, { items: [], purchases: [] }))
      }
      if (url === '/api/economy/transactions/') {
        return Promise.resolve(
          jsonResponse(200, { count: 0, next: null, previous: null, results: [] }),
        )
      }
      return Promise.resolve(jsonResponse(200, {}))
    })
    vi.stubGlobal('fetch', fetchMock)

    render(
      <TestProviders>
        <ShopPage />
      </TestProviders>,
    )

    await user.click(screen.getByRole('tab', { name: 'Objets' }))
    expect(await screen.findByRole('heading', { name: 'Aura' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Cadre' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Emblème' })).toBeInTheDocument()
    expect(
      await screen.findByRole('img', { name: 'Aperçu de ton avatar équipé' }),
    ).toBeInTheDocument()

    const card = screen.getByRole('article', { name: "Objet Aura d'émeraude" })
    expect(screen.queryByText('Aperçu')).not.toBeInTheDocument()
    const callsBefore = fetchMock.mock.calls.length

    await user.hover(card)
    expect(screen.getByText('Aperçu')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: "Aperçu avec Aura d'émeraude" })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(callsBefore)

    await user.unhover(card)
    expect(screen.queryByText('Aperçu')).not.toBeInTheDocument()
    fireEvent.focus(card)
    expect(screen.getByText('Aperçu')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(callsBefore)
  })
})
