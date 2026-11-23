import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { eachDate } from '../lib/calendarDates'
import {
  makeCalendarDay,
  makeCalendarRange,
  makeCalendarToday,
  todayIso,
} from '../test/fixtures'
import { TestProviders } from '../test/TestProviders'
import { CalendarPage } from './CalendarPage'

function jsonResponse(status: number, body?: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body }
}

function mockApi() {
  const fetchMock = vi.fn().mockImplementation((url: string) => {
    const today = todayIso()
    if (url === '/api/calendar/today/') {
      return Promise.resolve(jsonResponse(200, makeCalendarToday(makeCalendarDay(today))))
    }
    if (url.startsWith('/api/calendar/?')) {
      const params = new URL(url, 'http://localhost').searchParams
      const from = params.get('from') ?? today
      const to = params.get('to') ?? today
      const days = eachDate(from, to, 100).map((date) =>
        makeCalendarDay(date, { is_today: date === today }),
      )
      return Promise.resolve(jsonResponse(200, makeCalendarRange(from, to, days)))
    }
    if (url === '/api/seasons/current/') {
      return Promise.resolve(jsonResponse(404, { detail: 'Aucune saison active.' }))
    }
    return Promise.resolve(jsonResponse(200, {}))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderPage() {
  return render(
    <TestProviders initialEntries={['/calendrier']}>
      <CalendarPage />
    </TestProviders>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('CalendarPage', () => {
  it('change de vue au clic et synchronise les onglets avec l’URL', async () => {
    const user = userEvent.setup()
    mockApi()

    renderPage()

    expect(await screen.findByText('Validations du jour')).toBeInTheDocument()
    const tabs = screen.getByRole('tablist', { name: 'Vues du calendrier' })
    expect(tabs).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: "Aujourd'hui" })).toHaveAttribute(
      'aria-selected',
      'true',
    )

    await user.click(screen.getByRole('tab', { name: 'Semaine' }))
    expect(await screen.findByText(/Glisse une mission planifiée/)).toBeInTheDocument()
    expect(screen.getByTestId('location-search')).toHaveTextContent(
      `?vue=semaine&date=${todayIso()}`,
    )

    await user.click(screen.getByRole('tab', { name: 'Mois' }))
    expect(await screen.findByText(/jour actif|jours actifs/)).toBeInTheDocument()
    expect(screen.getByTestId('location-search')).toHaveTextContent(`?vue=mois&date=${todayIso()}`)

    await user.click(screen.getByRole('tab', { name: 'Saison' }))
    expect(await screen.findByText('Aucune saison active pour le moment.')).toBeInTheDocument()
    expect(screen.getByTestId('location-search')).toHaveTextContent(
      `?vue=saison&date=${todayIso()}`,
    )
  })

  it('navigue entre les onglets avec les flèches gauche et droite', async () => {
    const user = userEvent.setup()
    mockApi()

    renderPage()

    await screen.findByText('Validations du jour')
    const todayTab = screen.getByRole('tab', { name: "Aujourd'hui" })
    todayTab.focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Semaine' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByTestId('location-search')).toHaveTextContent('vue=semaine')

    await user.keyboard('{ArrowRight}{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Saison' })).toHaveAttribute('aria-selected', 'true')

    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: "Aujourd'hui" })).toHaveAttribute('aria-selected', 'true')

    await user.keyboard('{ArrowLeft}')
    expect(screen.getByRole('tab', { name: 'Saison' })).toHaveAttribute('aria-selected', 'true')
  })

  it('déplace la période avec les boutons Précédent, Suivant et Aujourd’hui', async () => {
    const user = userEvent.setup()
    mockApi()

    renderPage()

    await screen.findByText('Validations du jour')
    await user.click(screen.getByRole('button', { name: 'Suivant' }))
    expect(screen.getByTestId('location-search')).toHaveTextContent('vue=jour&date=')
    expect(screen.getByTestId('location-search')).not.toHaveTextContent(`date=${todayIso()}`)

    await user.click(screen.getByRole('button', { name: "Aujourd'hui" }))
    expect(screen.getByTestId('location-search')).toHaveTextContent(`vue=jour&date=${todayIso()}`)
  })
})
