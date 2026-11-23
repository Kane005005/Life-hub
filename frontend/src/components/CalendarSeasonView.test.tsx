import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { eachDate } from '../lib/calendarDates'
import {
  makeCalendarDay,
  makeCalendarEntry,
  makeCalendarQuest,
  makeCalendarRange,
  makeSeason,
} from '../test/fixtures'
import { TestProviders } from '../test/TestProviders'
import { CalendarSeasonView } from './CalendarSeasonView'

const SEASON = makeSeason({ start_date: '2026-11-23', end_date: '2027-02-20' })

function jsonResponse(status: number, body?: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body }
}

function mockApi(withSeason = true) {
  const fetchMock = vi.fn().mockImplementation((url: string) => {
    if (url === '/api/seasons/current/') {
      return withSeason
        ? Promise.resolve(jsonResponse(200, SEASON))
        : Promise.resolve(jsonResponse(404, { detail: 'Aucune saison active.' }))
    }
    if (url.startsWith('/api/calendar/?')) {
      const params = new URL(url, 'http://localhost').searchParams
      const from = params.get('from') ?? SEASON.start_date
      const to = params.get('to') ?? SEASON.end_date
      const days = eachDate(from, to, 100).map((date) =>
        makeCalendarDay(date, {
          is_today: date === '2026-11-24',
          entries:
            date === '2026-11-24'
              ? [
                  makeCalendarEntry('STEP', {
                    quest: makeCalendarQuest({ id: 5, title: 'Livre blanc', quest_type: 'MAIN' }),
                    step: { id: 9, title: 'Choisir le livre', is_done: false },
                  }),
                ]
              : [],
          summary:
            date === '2026-11-24'
              ? { completions: 1, xp: 10, credits: 10, dominant_territory: 'BODY' }
              : { completions: 0, xp: 0, credits: 0, dominant_territory: null },
        }),
      )
      return Promise.resolve(jsonResponse(200, makeCalendarRange(from, to, days)))
    }
    return Promise.resolve(jsonResponse(200, {}))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderSeason() {
  return render(
    <TestProviders>
      <CalendarSeasonView today="2026-11-24" onOpenDay={vi.fn()} />
    </TestProviders>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('CalendarSeasonView', () => {
  it('affiche 90 cases, le jour courant et les repères', async () => {
    mockApi()
    const { container } = renderSeason()

    expect(await screen.findByText(/Saison 2/)).toBeInTheDocument()
    const bar = container.querySelector('.lr-cal-season-bar')
    expect(bar).not.toBeNull()
    expect(bar?.querySelectorAll('button')).toHaveLength(90)

    const current = await screen.findByRole('button', { name: /mardi 24 novembre, 1 validation/ })
    expect(current).toHaveAttribute('aria-current', 'date')
    expect(current).toHaveClass('lr-cal-day--active-low')
    expect(container.querySelector('.lr-cal-marker--step')).toBeInTheDocument()
    expect(screen.getByText('Objectif principal')).toBeInTheDocument()
    expect(screen.getByText('Livrer un projet')).toBeInTheDocument()
  })

  it('affiche un état vide avec un lien vers les saisons', async () => {
    mockApi(false)
    renderSeason()

    expect(await screen.findByText('Aucune saison active pour le moment.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Saisons' })).toHaveAttribute('href', '/saisons')
  })
})
