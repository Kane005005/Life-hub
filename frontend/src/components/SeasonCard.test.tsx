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
})
