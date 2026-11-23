import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TestProviders } from '../test/TestProviders'
import { JournalPage } from './JournalPage'

function jsonResponse(status: number, body?: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body }
}

const emptyJournal = { count: 0, next: null, previous: null, results: [] }
const summary = {
  period: 'week',
  from: '2026-11-16',
  to: '2026-11-23',
  xp_by_day: [{ date: '2026-11-23', xp: 30 }],
  xp_by_territory: { KNOWLEDGE: 30 },
  completions: 2,
  rests: 1,
  achievements: 1,
  skills: 0,
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('JournalPage', () => {
  it('envoie les filtres de date et recherche et affiche le résumé', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.startsWith('/api/journal/summary/'))
        return Promise.resolve(jsonResponse(200, summary))
      if (url.startsWith('/api/journal/')) return Promise.resolve(jsonResponse(200, emptyJournal))
      return Promise.resolve(jsonResponse(200, {}))
    })
    vi.stubGlobal('fetch', fetchMock)

    render(
      <TestProviders initialEntries={['/journal']}>
        <JournalPage />
      </TestProviders>,
    )

    expect(await screen.findByText('Validations 2')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Du'), '2026-11-01')
    await user.type(screen.getByLabelText('Recherche'), 'boss')

    await waitFor(() => {
      const calls = fetchMock.mock.calls.map(([url]) => String(url))
      expect(calls.some((url) => url.includes('date_from=2026-11-01'))).toBe(true)
      expect(calls.some((url) => url.includes('q=boss'))).toBe(true)
    })
  })
})
