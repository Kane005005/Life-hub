import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeSeason } from '../test/fixtures'
import { TestProviders } from '../test/TestProviders'
import { SeasonCard } from './SeasonCard'

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

describe('SeasonCard', () => {
  it('coche un objectif et envoie un PATCH', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, makeSeason()))
    vi.stubGlobal('fetch', fetchMock)

    render(
      <TestProviders>
        <SeasonCard season={makeSeason()} />
      </TestProviders>,
    )

    await user.click(screen.getByRole('checkbox', { name: 'Livrer un projet' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/seasons/2/',
        expect.objectContaining({ method: 'PATCH' }),
      )
    })
  })

  it('affiche la jauge des objectifs atteints renvoyée par l’API', () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, makeSeason())))
    const season = makeSeason({
      objectives: [
        { id: 1, title: 'Livrer un projet', is_main: true, is_done: true, order: 0 },
        { id: 2, title: 'Lire deux livres', is_main: false, is_done: false, order: 1 },
        { id: 3, title: 'Marcher chaque jour', is_main: false, is_done: false, order: 2 },
      ],
      summary: {
        ...makeSeason().summary,
        objectives_done: 1,
        objectives_total: 3,
      },
    })

    render(
      <TestProviders>
        <SeasonCard season={season} featured />
      </TestProviders>,
    )

    expect(screen.getByText('1 / 3 objectifs atteints')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Objectifs atteints' })).toHaveAttribute(
      'aria-valuenow',
      '1',
    )
  })

  it('affiche la durée indisponible sans casser la barre de temps', () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, makeSeason())))

    render(
      <TestProviders>
        <SeasonCard season={makeSeason({ start_date: '', end_date: '', days_left: 5 })} />
      </TestProviders>,
    )

    expect(screen.getByText('Durée indisponible.')).toBeInTheDocument()
    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName === 'P' && /^5 jours restants$/.test(element.textContent ?? ''),
      ),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('progressbar', { name: 'Temps écoulé de la saison' }),
    ).not.toBeInTheDocument()
  })

  it('compte le jour en cours : premier jour d’une saison de 90 jours', () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, makeSeason())))
    render(
      <TestProviders>
        <SeasonCard
          season={makeSeason({ start_date: '2026-11-23', end_date: '2027-02-20', days_left: 89 })}
        />
      </TestProviders>,
    )
    expect(screen.getByText('Jour 1 sur 90')).toBeInTheDocument()
  })
})
