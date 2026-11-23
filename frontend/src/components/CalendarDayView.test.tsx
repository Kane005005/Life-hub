import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TERRITORY_BY_CODE } from '../lib/labels'
import {
  makeCalendarDay,
  makeCalendarEntry,
  makeCalendarQuest,
  makeCalendarRange,
  makeCalendarToday,
  makeCompletionResult,
} from '../test/fixtures'
import { TestProviders } from '../test/TestProviders'
import { CalendarDayView } from './CalendarDayView'

const TODAY = '2026-11-24'
const OTHER_DAY = '2026-11-23'

function jsonResponse(status: number, body?: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body }
}

function mockApi(
  todayDay: ReturnType<typeof makeCalendarToday>,
  otherDay = makeCalendarDay(OTHER_DAY),
) {
  const fetchMock = vi.fn().mockImplementation((url: string) => {
    if (url === '/api/calendar/today/') {
      return Promise.resolve(jsonResponse(200, todayDay))
    }
    if (url.startsWith('/api/calendar/?')) {
      return Promise.resolve(jsonResponse(200, makeCalendarRange(OTHER_DAY, OTHER_DAY, [otherDay])))
    }
    if (/^\/api\/quests\/\d+\/complete\/$/.test(url)) {
      return Promise.resolve(
        jsonResponse(
          200,
          makeCompletionResult({ result: { ...makeCompletionResult().result, levels_gained: 0 } }),
        ),
      )
    }
    return Promise.resolve(jsonResponse(200, {}))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderDay(date: string, today = TODAY) {
  return render(
    <TestProviders>
      <CalendarDayView date={date} today={today} />
    </TestProviders>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('CalendarDayView', () => {
  it('regroupe les missions par territoire et montre l’avancement hebdomadaire', async () => {
    const day = makeCalendarDay(TODAY, {
      entries: [
        makeCalendarEntry('DAILY', {
          quest: makeCalendarQuest({ id: 3, title: 'Méditer', territory: 'INNER_WORLD' }),
        }),
        makeCalendarEntry('SCHEDULED', {
          quest: makeCalendarQuest({ id: 4, title: 'Réviser', territory: 'TECHNOLOGY' }),
        }),
      ],
      completions: [
        {
          quest_id: 3,
          title: 'Méditer',
          territory: 'INNER_WORLD',
          quest_type: 'DAILY',
          xp: 5,
          credits: 5,
          completed_at: '2026-11-24T07:12:00Z',
        },
      ],
      summary: { completions: 1, xp: 5, credits: 5, dominant_territory: 'INNER_WORLD' },
    })
    mockApi(
      makeCalendarToday(day, {
        weekly: [
          { quest: makeCalendarQuest({ title: 'Lire' }), done: false, days_left_in_week: 6 },
          {
            quest: makeCalendarQuest({ id: 8, title: 'Ranger' }),
            done: true,
            days_left_in_week: 6,
          },
        ],
      }),
    )

    renderDay(TODAY)

    expect(await screen.findByText('Validations du jour')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Monde intérieur/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Technologie/ })).toBeInTheDocument()
    const group = screen.getByRole('heading', { name: /Monde intérieur/ }).closest('.lr-cal-group')
    expect(group).toHaveAttribute(
      'style',
      expect.stringContaining(`--c: ${TERRITORY_BY_CODE.INNER_WORLD.color}`),
    )
    expect(screen.getAllByText('Méditer').length).toBeGreaterThan(0)
    expect(screen.getByText('Réviser')).toBeInTheDocument()
    expect(screen.getByText('Monde intérieur', { selector: 'dd' })).toBeInTheDocument()
    expect(screen.getByText('6 jours restants cette semaine')).toBeInTheDocument()
    expect(screen.getByText('Validée cette semaine')).toBeInTheDocument()
  })

  it('reste neutre quand le jour n’a aucune validation', async () => {
    const day = makeCalendarDay(TODAY)
    mockApi(makeCalendarToday(day))
    const { container } = renderDay(TODAY)

    expect(await screen.findByText('Aucune validation ce jour-là.')).toBeInTheDocument()
    expect(container.textContent).not.toMatch(/raté|série|manqué/i)
    expect(container.querySelector('.lr-field-error')).not.toBeInTheDocument()
    expect(container.querySelector('[role="alert"]')).not.toBeInTheDocument()
    for (const element of Array.from(container.querySelectorAll('[class]'))) {
      expect(element.className).not.toMatch(/error|fail|danger/i)
    }
  })

  it('affiche un bouton Valider aujourd’hui seulement', async () => {
    const user = userEvent.setup()
    const todayDay = makeCalendarToday(
      makeCalendarDay(TODAY, {
        entries: [makeCalendarEntry('DAILY', { quest: makeCalendarQuest({ id: 3 }) })],
      }),
    )
    const fetchMock = mockApi(
      todayDay,
      makeCalendarDay(OTHER_DAY, { entries: [makeCalendarEntry('DAILY')] }),
    )

    const { unmount } = renderDay(TODAY)
    expect(await screen.findByRole('button', { name: 'Valider' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Valider' }))
    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          ([url, init]) =>
            url === '/api/quests/3/complete/' &&
            (init as RequestInit | undefined)?.method === 'POST',
        ),
      ).toBe(true)
    })
    unmount()

    renderDay(OTHER_DAY)
    expect(await screen.findByText('Réviser le contrat API')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Valider' })).not.toBeInTheDocument()
  })

  it('affiche une échéance passée sur une pastille neutre', async () => {
    const day = makeCalendarDay(TODAY, {
      entries: [
        makeCalendarEntry('DUE', {
          quest: makeCalendarQuest({ title: 'Rapport', due_date: '2026-11-20' }),
          due_passed: true,
        }),
      ],
    })
    mockApi(makeCalendarToday(day))
    const { container } = renderDay(TODAY)

    const pill = await screen.findByText('échéance passée')
    expect(pill).toHaveClass('lr-cal-past')
    expect(container.querySelector('.lr-field-error')).not.toBeInTheDocument()
  })

  it('permet de cocher une étape planifiée', async () => {
    const user = userEvent.setup()
    const stepEntry = makeCalendarEntry('STEP', {
      quest: makeCalendarQuest({ id: 5, title: 'Livre blanc', quest_type: 'MAIN' }),
      step: { id: 9, title: 'Choisir le livre', is_done: false },
    })
    const fetchMock = mockApi(makeCalendarToday(makeCalendarDay(TODAY, { entries: [stepEntry] })))

    renderDay(TODAY)

    expect(await screen.findByText('Étape de Livre blanc')).toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: /Étape terminée/ }))
    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          ([url, init]) =>
            url === '/api/quests/5/steps/9/toggle/' &&
            (init as RequestInit | undefined)?.method === 'POST',
        ),
      ).toBe(true)
    })
  })

  it('ne propose ni XP ni bouton Valider sur une étape', async () => {
    const stepEntry = makeCalendarEntry('STEP', {
      quest: makeCalendarQuest({ id: 5, title: 'Livre blanc', quest_type: 'MAIN', xp_reward: 60 }),
      step: { id: 9, title: 'Choisir le livre', is_done: false },
    })
    mockApi(makeCalendarToday(makeCalendarDay(TODAY, { entries: [stepEntry] })))

    renderDay(TODAY)

    const card = await screen.findByRole('article', { name: 'Choisir le livre' })
    expect(card).toHaveTextContent('Récompense à la fin de la mission')
    expect(card).not.toHaveTextContent('+60 XP')
    expect(screen.queryByRole('button', { name: 'Valider' })).not.toBeInTheDocument()
  })

  it('signale sobrement une mission déjà validée', async () => {
    const weekly = makeCalendarEntry('WEEKLY', {
      quest: makeCalendarQuest({ id: 7, title: 'Sport', quest_type: 'WEEKLY' }),
      done: true,
    })
    mockApi(makeCalendarToday(makeCalendarDay(TODAY, { entries: [weekly] })))

    renderDay(TODAY)

    const card = await screen.findByRole('article', { name: 'Sport' })
    expect(card).toHaveTextContent('Validée cette semaine')
    expect(card.querySelector('button')).toBeNull()
  })
})
