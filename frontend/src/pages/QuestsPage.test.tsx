import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TestProviders } from '../test/TestProviders'
import { QuestsPage } from './QuestsPage'

function jsonResponse(status: number, body?: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }
}

function emptyPage() {
  return { count: 0, next: null, previous: null, results: [] }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('QuestsPage', () => {
  it('reflète les filtres dans l’URL et dans la requête', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, emptyPage()))
    vi.stubGlobal('fetch', fetchMock)

    render(
      <TestProviders initialEntries={['/missions']}>
        <QuestsPage />
      </TestProviders>,
    )

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'Territoire' })).toBeInTheDocument()
    })
    await waitFor(() => {
      const firstCall = fetchMock.mock.calls[0]
      expect(firstCall[0]).toContain('status=AVAILABLE')
    })

    await user.selectOptions(screen.getByRole('combobox', { name: 'Territoire' }), 'TECHNOLOGY')

    await waitFor(() => {
      expect(screen.getByTestId('location-search')).toHaveTextContent('territory=TECHNOLOGY')
    })
    await waitFor(() => {
      const calls = fetchMock.mock.calls.map(([url]) => String(url))
      expect(calls.some((url) => url.includes('territory=TECHNOLOGY'))).toBe(true)
      expect(calls.some((url) => url.includes('status=IN_PROGRESS'))).toBe(true)
    })

    await user.selectOptions(screen.getByRole('combobox', { name: 'Statut' }), 'COMPLETED')

    await waitFor(() => {
      expect(screen.getByTestId('location-search')).toHaveTextContent('status=COMPLETED')
    })
    await waitFor(() => {
      const calls = fetchMock.mock.calls.map(([url]) => String(url))
      expect(calls.some((url) => url.includes('status=COMPLETED'))).toBe(true)
    })
  })
})
