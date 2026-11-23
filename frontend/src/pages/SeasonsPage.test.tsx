import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeSeason } from '../test/fixtures'
import { TestProviders } from '../test/TestProviders'
import { SeasonsPage } from './SeasonsPage'

function jsonResponse(status: number, body?: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('SeasonsPage', () => {
  it('affiche le formulaire sans saison active', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url === '/api/seasons/current/')
          return Promise.resolve(jsonResponse(404, { detail: 'Aucune saison active.' }))
        if (url === '/api/seasons/')
          return Promise.resolve(
            jsonResponse(200, { count: 0, next: null, previous: null, results: [] }),
          )
        return Promise.resolve(jsonResponse(200, {}))
      }),
    )

    render(
      <TestProviders>
        <SeasonsPage />
      </TestProviders>,
    )

    expect(await screen.findByText(/Aucune saison en cours/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Créer la saison' })).toBeInTheDocument()
  })

  it('affiche la saison active et clôture avec confirmation', async () => {
    const user = userEvent.setup()
    const season = makeSeason()
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url === '/api/seasons/current/') return Promise.resolve(jsonResponse(200, season))
      if (url === '/api/seasons/')
        return Promise.resolve(
          jsonResponse(200, { count: 1, next: null, previous: null, results: [season] }),
        )
      if (url === '/api/seasons/2/close/' && init?.method === 'POST') {
        return Promise.resolve(
          jsonResponse(200, { closed: season, next: { ...season, id: 3, number: 3 } }),
        )
      }
      return Promise.resolve(jsonResponse(200, season))
    })
    vi.stubGlobal('fetch', fetchMock)

    render(
      <TestProviders>
        <SeasonsPage />
      </TestProviders>,
    )

    expect(await screen.findByRole('heading', { name: 'Saison 2' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Clôturer maintenant' }))
    expect(screen.getByRole('dialog', { name: 'Clôturer la saison ?' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Clôturer' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/seasons/2/close/',
        expect.objectContaining({ method: 'POST' }),
      )
    })
  })
})
