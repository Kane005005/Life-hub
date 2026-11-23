import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FxContext } from '../features/fx/FxContext'
import type { FxApi } from '../features/fx/FxContext'
import { QuestCard } from '../components/QuestCard'
import { SkillDetail } from '../components/SkillDetail'
import { makeCompletionResult, makeQuest, makeShopItem, makeSkillNode } from '../test/fixtures'
import { ShopPage } from '../pages/ShopPage'

function jsonResponse(status: number, body?: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body }
}

function FlowProviders({ children, fx }: { children: ReactNode; fx: Partial<FxApi> }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
      }),
  )
  return (
    <QueryClientProvider client={client}>
      <FxContext.Provider
        value={{
          burst: () => undefined,
          shake: () => undefined,
          showLevelUp: () => undefined,
          toast: () => undefined,
          announce: () => undefined,
          ...fx,
        }}
      >
        <MemoryRouter>{children}</MemoryRouter>
      </FxContext.Provider>
    </QueryClientProvider>
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Parcours phase 2', () => {
  it('débloque un succès à la validation, affiche une compétence débloquée et met à jour les crédits boutique', async () => {
    const user = userEvent.setup()
    const announce = vi.fn()
    const toast = vi.fn()

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/quests/17/complete/') {
        return Promise.resolve(
          jsonResponse(
            200,
            makeCompletionResult({
              result: {
                ...makeCompletionResult().result,
                levels_gained: 0,
                achievements: [{ code: 'FIRST_QUEST', label: 'Premier pas' }],
              },
            }),
          ),
        )
      }
      if (url === '/api/skills/knowledge.reading.t1/unlock/') {
        return Promise.resolve(
          jsonResponse(200, {
            skill: makeSkillNode({ state: 'UNLOCKED' }),
            skill_points: { available: 0, spent: 1 },
            message: 'Compétence débloquée : Lecteur régulier.',
          }),
        )
      }
      if (url === '/api/character/') {
        return Promise.resolve(
          jsonResponse(200, {
            pseudonym: 'Kane',
            bio: '',
            character_class: 'ARCHITECT',
            is_onboarded: true,
            level: 2,
            xp_in_level: 20,
            xp_required: 100,
            total_xp: 120,
            rank: { code: 'INITIATE', label: 'Initié' },
            credits: 150,
            skill_points: { available: 1, spent: 0 },
            avatar: { silhouette: 'A', color: '#2FD08B', accent: '#EDE9DF' },
            stats: [],
            active_title: null,
            titles: [],
            equipment: { AURA: null, FRAME: null, EMBLEM: null },
          }),
        )
      }
      if (url.startsWith('/api/economy/rewards/?category=REWARD'))
        return Promise.resolve(jsonResponse(200, []))
      if (url.startsWith('/api/economy/rewards/?category=ARTIFACT'))
        return Promise.resolve(jsonResponse(200, [makeShopItem()]))
      if (url === '/api/economy/inventory/')
        return Promise.resolve(jsonResponse(200, { items: [], purchases: [] }))
      if (url === '/api/economy/transactions/')
        return Promise.resolve(
          jsonResponse(200, { count: 0, next: null, previous: null, results: [] }),
        )
      if (url === '/api/economy/rewards/4/purchase/') {
        return Promise.resolve(
          jsonResponse(200, {
            item: makeShopItem({ owned: true }),
            credits: 150,
            message: "Objet obtenu : Aura d'émeraude. -150 crédits.",
          }),
        )
      }
      return Promise.resolve(jsonResponse(200, {}))
    })
    vi.stubGlobal('fetch', fetchMock)

    const { rerender } = render(
      <FlowProviders fx={{ announce, toast }}>
        <QuestCard quest={makeQuest()} />
        <SkillDetail node={makeSkillNode({ state: 'UNLOCKABLE', unlocked_at: null })} />
        <ShopPage />
      </FlowProviders>,
    )

    await user.click(screen.getByRole('button', { name: 'Valider' }))
    await waitFor(
      () => {
        expect(toast).toHaveBeenCalledWith('Succès débloqué : Premier pas.')
      },
      { timeout: 3000 },
    )

    await user.click(screen.getByRole('button', { name: /Débloquer \(1 point\)/i }))
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/skills/knowledge.reading.t1/unlock/',
        expect.objectContaining({ method: 'POST' }),
      )
    })

    rerender(
      <FlowProviders fx={{ announce, toast }}>
        <SkillDetail node={makeSkillNode({ state: 'UNLOCKED' })} />
        <ShopPage />
      </FlowProviders>,
    )
    expect(screen.getByText('Débloquée')).toBeInTheDocument()

    await user.click(await screen.findByRole('tab', { name: 'Objets' }))
    await user.click(await screen.findByRole('button', { name: 'Acheter' }))
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/economy/rewards/4/purchase/',
        expect.objectContaining({ method: 'POST' }),
      )
    })
  })
})
