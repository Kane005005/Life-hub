import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeQuest } from '../test/fixtures'
import { TestProviders } from '../test/TestProviders'
import { QuestForm } from './QuestForm'

function jsonResponse(status: number, body?: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }
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
})

describe('QuestForm', () => {
  it('envoie les étapes et la branche, jamais la récompense XP', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/settings/game/') {
        return Promise.resolve(jsonResponse(200, settings))
      }
      return Promise.resolve(jsonResponse(201, makeQuest()))
    })
    vi.stubGlobal('fetch', fetchMock)

    render(
      <TestProviders>
        <QuestForm />
      </TestProviders>,
    )

    expect(await screen.findByText('XP prévue : 25')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Titre'), 'Écrire le rapport')
    await user.type(screen.getByLabelText('Branche de compétence'), 'programming')
    await user.click(screen.getByRole('button', { name: 'Ajouter une étape' }))
    await user.type(screen.getByLabelText('Étape 1'), 'Rassembler les notes')
    await user.click(screen.getByLabelText('Obligatoire'))
    await user.click(screen.getByRole('button', { name: 'Créer la mission' }))

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(
        ([url, init]) => url === '/api/quests/' && (init as RequestInit).method === 'POST',
      )
      expect(call).toBeDefined()
      const body = JSON.parse((call?.[1] as RequestInit).body as string) as Record<string, unknown>
      expect(body.title).toBe('Écrire le rapport')
      expect(body.skill_branch).toBe('programming')
      expect(body.steps).toEqual([{ title: 'Rassembler les notes', is_required: true }])
      expect(body).not.toHaveProperty('xp_reward')
    })
  })
})
