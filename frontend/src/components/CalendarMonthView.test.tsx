import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useSearchParams } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { monthGrid } from '../lib/calendarDates'
import { TERRITORY_BY_CODE } from '../lib/labels'
import { makeCalendarDay, makeCalendarRange } from '../test/fixtures'
import { TestProviders } from '../test/TestProviders'
import { CalendarMonthView } from './CalendarMonthView'

const ANCHOR = '2026-11-15'
const GRID = monthGrid(ANCHOR)

function jsonResponse(status: number, body?: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body }
}

function mockApi() {
  const fetchMock = vi.fn().mockImplementation((url: string) => {
    if (url.startsWith('/api/calendar/?')) {
      const active = new Map<string, { count: number; territory: 'INNER_WORLD' | 'BODY' }>([
        ['2026-11-24', { count: 2, territory: 'INNER_WORLD' }],
        ['2026-11-25', { count: 1, territory: 'BODY' }],
      ])
      const days = GRID.map((date) => {
        const info = active.get(date)
        return makeCalendarDay(date, {
          is_today: date === '2026-11-24',
          summary: {
            completions: info?.count ?? 0,
            xp: (info?.count ?? 0) * 10,
            credits: (info?.count ?? 0) * 10,
            dominant_territory: info?.territory ?? null,
          },
        })
      })
      return Promise.resolve(
        jsonResponse(200, makeCalendarRange(GRID[0], GRID[GRID.length - 1], days)),
      )
    }
    return Promise.resolve(jsonResponse(200, {}))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function MonthHarness() {
  const [params, setParams] = useSearchParams()
  return (
    <CalendarMonthView
      date={ANCHOR}
      today="2026-11-24"
      onOpenDay={(day) => {
        const next = new URLSearchParams(params)
        next.set('vue', 'jour')
        next.set('date', day)
        setParams(next)
      }}
    />
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
  window.history.pushState({}, '', '/')
})

describe('CalendarMonthView', () => {
  it('colore les jours actifs et laisse les autres neutres', async () => {
    mockApi()
    const { container } = render(
      <TestProviders>
        <MonthHarness />
      </TestProviders>,
    )

    const active = await screen.findByRole('button', {
      name: 'mardi 24 novembre, 2 validations',
    })
    expect(active).toHaveClass('lr-cal-day--active-medium')
    expect(active).toHaveAttribute(
      'style',
      expect.stringContaining(`--c: ${TERRITORY_BY_CODE.INNER_WORLD.color}`),
    )

    const single = screen.getByRole('button', { name: 'mercredi 25 novembre, 1 validation' })
    expect(single).toHaveClass('lr-cal-day--active-low')
    expect(single).toHaveAttribute(
      'style',
      expect.stringContaining(`--c: ${TERRITORY_BY_CODE.BODY.color}`),
    )

    const quiet = screen.getByRole('button', { name: 'lundi 23 novembre, 0 validation' })
    expect(quiet.className).not.toMatch(/active/)

    expect(screen.getByText('2 jours actifs ce mois-ci')).toBeInTheDocument()
    expect(container.querySelectorAll('.lr-cal-day').length).toBe(GRID.length)
  })

  it('ouvre la vue Jour de la date cliquée', async () => {
    const user = userEvent.setup()
    mockApi()

    render(
      <TestProviders>
        <MonthHarness />
      </TestProviders>,
    )

    await user.click(
      await screen.findByRole('button', { name: 'mardi 24 novembre, 2 validations' }),
    )
    expect(screen.getByTestId('location-search')).toHaveTextContent('?vue=jour&date=2026-11-24')
  })
})
