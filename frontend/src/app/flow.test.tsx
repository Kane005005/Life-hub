import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { clearToken, setToken } from '../lib/auth'
import { makeCharacter, makeCompletionResult, makeQuest, makeTerritory } from '../test/fixtures'

function jsonResponse(status: number, body?: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }
}

function page<T>(results: T[]) {
  return { count: results.length, next: null, previous: null, results }
}

const settings = {
  xp_by_difficulty: {
    TRIVIAL: 5,
    EASY: 25,
    MEDIUM: 50,
    HARD: 80,
    EPIC: 120,
    LEGENDARY: 200,
  },
  credits_per_xp: 0.2,
  skill_points_per_level: 1,
  territory_stat_divisor: 10,
  territory_stat_display_max: 100,
  territory_state_thresholds: { DISCOVERY: 20, DEVELOPMENT: 60, MASTERY: 90 },
  ranks: [],
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  clearToken()
  window.history.pushState({}, '', '/')
})

describe('parcours créer, valider, monter de niveau', () => {
  it('affiche la montée de niveau puis le nouveau niveau dans la barre supérieure', async () => {
    const user = userEvent.setup()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)

    let character = makeCharacter({ level: 2, xp_in_level: 20, xp_required: 100, total_xp: 120 })
    let quest = makeQuest({ id: 99, title: 'Écrire le rapport', status: 'AVAILABLE' })

    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET'
      if (url === '/api/character/') {
        return Promise.resolve(jsonResponse(200, character))
      }
      if (url === '/api/world/territories/') {
        return Promise.resolve(jsonResponse(200, [makeTerritory()]))
      }
      if (url === '/api/settings/game/') {
        return Promise.resolve(jsonResponse(200, settings))
      }
      if (url === '/api/journal/' || url.startsWith('/api/health/')) {
        return Promise.resolve(jsonResponse(200, page([])))
      }
      if (url.startsWith('/api/quests/')) {
        if (method === 'POST' && url === '/api/quests/') {
          const body = JSON.parse(init?.body as string) as { title: string }
          quest = makeQuest({ id: 99, title: body.title, status: 'AVAILABLE' })
          return Promise.resolve(jsonResponse(201, quest))
        }
        if (url === '/api/quests/99/accept/') {
          quest = { ...quest, status: 'IN_PROGRESS' }
          return Promise.resolve(jsonResponse(200, quest))
        }
        if (url === '/api/quests/99/complete/') {
          character = {
            ...character,
            level: 3,
            xp_in_level: 45,
            xp_required: 200,
            total_xp: 220,
          }
          quest = { ...quest, status: 'COMPLETED' }
          return Promise.resolve(
            jsonResponse(
              200,
              makeCompletionResult({
                quest,
                result: {
                  ...makeCompletionResult().result,
                  level_before: 2,
                  level_after: 3,
                  levels_gained: 1,
                  level_message: 'Tu passes niveau 3.',
                },
              }),
            ),
          )
        }
        return Promise.resolve(jsonResponse(200, page([quest])))
      }
      return Promise.resolve(jsonResponse(200, page([])))
    })
    vi.stubGlobal('fetch', fetchMock)
    setToken('jeton-abs')
    window.history.pushState({}, '', '/missions')

    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Nouvelle mission' }))
    await user.type(screen.getByLabelText('Titre'), 'Écrire le rapport')
    await user.click(screen.getByRole('button', { name: 'Créer la mission' }))

    const created = await screen.findByText('Écrire le rapport')
    expect(created).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Accepter' }))
    await user.click(await screen.findByRole('button', { name: 'Valider' }))

    const overlay = await screen.findByRole('dialog', { name: 'Niveau atteint' }, { timeout: 2000 })
    expect(overlay).toHaveTextContent('Tu passes niveau 3.')

    await user.click(screen.getByRole('button', { name: 'Continuer' }))

    await waitFor(() => {
      expect(screen.getByText('NIV 3')).toBeInTheDocument()
    })
  })
})
