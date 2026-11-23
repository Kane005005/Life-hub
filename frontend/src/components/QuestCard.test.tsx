import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeCompletionResult, makeQuest } from '../test/fixtures'
import { TestProviders } from '../test/TestProviders'
import { QuestCard } from './QuestCard'

function jsonResponse(status: number, body?: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('QuestCard', () => {
  it.each([
    ['AVAILABLE', false, 'DAILY', 'Accepter'],
    ['PAUSED', false, 'DAILY', 'Accepter'],
    ['IN_PROGRESS', false, 'DAILY', 'Valider'],
    ['IN_PROGRESS', true, 'DAILY', "Validée aujourd'hui"],
    ['IN_PROGRESS', true, 'WEEKLY', 'Validée cette semaine'],
    ['COMPLETED', false, 'DAILY', 'Validée'],
  ] as const)(
    'affiche le bon libellé pour %s (période %s, type %s)',
    (status, completedThisPeriod, questType, label) => {
      render(
        <TestProviders>
          <QuestCard
            quest={makeQuest({
              status,
              completed_this_period: completedThisPeriod,
              quest_type: questType,
            })}
          />
        </TestProviders>,
      )

      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    },
  )

  it('valide la mission et annonce le message de l’API', async () => {
    const user = userEvent.setup()
    const announce = vi.fn()
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        200,
        makeCompletionResult({
          result: { ...makeCompletionResult().result, levels_gained: 0 },
        }),
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    render(
      <TestProviders fx={{ announce }}>
        <QuestCard quest={makeQuest()} />
      </TestProviders>,
    )

    await user.click(screen.getByRole('button', { name: 'Valider' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/quests/17/complete/',
        expect.objectContaining({ method: 'POST' }),
      )
    })
    expect(announce).toHaveBeenCalledWith('Mission validée. +25 XP.')
  })

  it('affiche le détail d’une erreur 409', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(409, {})))

    render(
      <TestProviders>
        <QuestCard quest={makeQuest()} />
      </TestProviders>,
    )

    await user.click(screen.getByRole('button', { name: 'Valider' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Mission déjà validée.')
  })

  it('met un boss en avant avec le bouton Affronter', () => {
    const { container } = render(
      <TestProviders>
        <QuestCard quest={makeQuest({ quest_type: 'BOSS' })} />
      </TestProviders>,
    )

    expect(container.querySelector('.lr-q--boss')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Affronter' })).toBeInTheDocument()
  })
})
