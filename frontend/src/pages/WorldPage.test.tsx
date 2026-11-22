import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { WorldPage } from './WorldPage'

function createQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('WorldPage', () => {
  it('affiche le serveur connecté quand /api/health/ répond ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: 'ok' }),
      }),
    )

    render(
      <QueryClientProvider client={createQueryClient()}>
        <WorldPage />
      </QueryClientProvider>,
    )

    expect(await screen.findByText('Serveur local : connecté.')).toBeInTheDocument()
  })

  it('affiche le message d erreur quand /api/health/ répond 500', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      }),
    )

    render(
      <QueryClientProvider client={createQueryClient()}>
        <WorldPage />
      </QueryClientProvider>,
    )

    expect(
      await screen.findByText("Serveur local injoignable. Vérifie qu'il tourne, puis relance."),
    ).toBeInTheDocument()
  })
})
