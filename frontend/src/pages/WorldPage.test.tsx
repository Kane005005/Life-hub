import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeTerritory } from '../test/fixtures'
import { TestProviders } from '../test/TestProviders'
import { WorldPage } from './WorldPage'

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

describe('WorldPage', () => {
  it('affiche la carte et les missions du jour', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url === '/api/world/territories/') {
          return Promise.resolve(jsonResponse(200, [makeTerritory()]))
        }
        if (url.startsWith('/api/quests/')) {
          return Promise.resolve(
            jsonResponse(200, { count: 0, next: null, previous: null, results: [] }),
          )
        }
        return Promise.resolve(jsonResponse(200, { status: 'ok' }))
      }),
    )

    render(
      <TestProviders>
        <WorldPage />
      </TestProviders>,
    )

    expect(await screen.findByRole('heading', { name: 'Ta carte', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('01 · Le monde')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /Technologie/ })).toBeInTheDocument()
  })
})
