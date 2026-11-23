import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { weekDates } from '../lib/calendarDates'
import {
  makeCalendarDay,
  makeCalendarEntry,
  makeCalendarQuest,
  makeCalendarRange,
} from '../test/fixtures'
import { TestProviders } from '../test/TestProviders'
import { CalendarWeekView } from './CalendarWeekView'

const ANCHOR = '2026-11-24'
const DAYS = weekDates(ANCHOR)

function jsonResponse(status: number, body?: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body }
}

function mockApi() {
  const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
    if (url === `/api/calendar/?from=${DAYS[0]}&to=${DAYS[6]}`) {
      const days = DAYS.map((date, index) =>
        makeCalendarDay(date, {
          is_today: date === ANCHOR,
          entries: [
            makeCalendarEntry('DAILY', { quest: makeCalendarQuest({ id: 20, title: 'Méditer' }) }),
            makeCalendarEntry('WEEKLY', {
              quest: makeCalendarQuest({ id: 21, title: 'Lire', quest_type: 'WEEKLY' }),
            }),
            ...(index === 0
              ? [
                  makeCalendarEntry('SCHEDULED', {
                    quest: makeCalendarQuest({ id: 17, title: 'Réviser' }),
                  }),
                ]
              : []),
          ],
        }),
      )
      return Promise.resolve(jsonResponse(200, makeCalendarRange(DAYS[0], DAYS[6], days)))
    }
    if (url === '/api/quests/17/' && init?.method === 'PATCH') {
      return Promise.resolve(jsonResponse(200, makeCalendarQuest({ id: 17 })))
    }
    if (url === '/api/quests/17/steps/9/' && init?.method === 'PATCH') {
      return Promise.resolve(jsonResponse(200, makeCalendarQuest({ id: 17 })))
    }
    return Promise.resolve(jsonResponse(200, {}))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function patchCall(fetchMock: ReturnType<typeof mockApi>) {
  return fetchMock.mock.calls.find(
    ([url, init]) => url === '/api/quests/17/' && (init as RequestInit | undefined)?.method === 'PATCH',
  )
}

function renderWeek() {
  return render(
    <TestProviders>
      <CalendarWeekView date={ANCHOR} today={ANCHOR} />
    </TestProviders>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('CalendarWeekView', () => {
  it('affiche les quotidiennes et les hebdomadaires dans les sept colonnes', async () => {
    mockApi()
    renderWeek()

    expect(await screen.findAllByText('Méditer')).toHaveLength(7)
    expect(screen.getAllByText('Lire')).toHaveLength(7)
    expect(screen.getAllByLabelText('mardi 24 novembre')).toHaveLength(1)
  })

  it('replanifie par glisser-déposer avec la date de la colonne', async () => {
    const fetchMock = mockApi()
    renderWeek()

    const title = await screen.findByText('Réviser')
    const card = title.closest('.lr-cal-movable') as HTMLElement
    const target = screen.getByLabelText('mardi 24 novembre')
    const dataTransfer = {
      effectAllowed: '',
      dropEffect: '',
      setData: vi.fn(),
      getData: vi.fn(() => ''),
    }

    fireEvent.dragStart(card, { dataTransfer })
    fireEvent.dragOver(target, { dataTransfer })
    expect(target).toHaveClass('lr-cal-col--over')
    fireEvent.drop(target, { dataTransfer })

    await waitFor(() => {
      const call = patchCall(fetchMock)
      expect(call).toBeDefined()
      const body = JSON.parse((call?.[1] as RequestInit).body as string) as Record<string, unknown>
      expect(body.scheduled_date).toBe('2026-11-24')
    })
    expect(await screen.findByText('Mission replanifiée au mardi 24 novembre.')).toBeInTheDocument()
  })

  it('replanifie au clavier avec le bouton Déplacer', async () => {
    const user = userEvent.setup()
    const fetchMock = mockApi()
    renderWeek()

    const card = (await screen.findByText('Réviser')).closest('.lr-cal-movable') as HTMLElement
    await user.click(within(card).getByRole('button', { name: 'Déplacer' }))
    await user.click(screen.getByRole('button', { name: 'mercredi 25 novembre' }))

    await waitFor(() => {
      const call = patchCall(fetchMock)
      expect(call).toBeDefined()
      const body = JSON.parse((call?.[1] as RequestInit).body as string) as Record<string, unknown>
      expect(body.scheduled_date).toBe('2026-11-25')
    })
  })

  it('ne rend pas les missions quotidiennes déplaçables', async () => {
    mockApi()
    renderWeek()

    const daily = (await screen.findAllByText('Méditer'))[0].closest('.lr-cal-line') as HTMLElement
    expect(daily).not.toHaveAttribute('draggable')
    expect(within(daily).queryByRole('button', { name: 'Déplacer' })).not.toBeInTheDocument()
  })
})
