import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearToken, getToken } from '../lib/auth'
import { LoginPage } from './LoginPage'

function jsonResponse(status: number, body?: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
  clearToken()
})

describe('LoginPage', () => {
  it('enregistre le jeton après une connexion réussie', async () => {
    const user = userEvent.setup()
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse(200, { token: 'jeton-abs', user: { id: 1, username: 'kane' } }),
        ),
    )
    renderPage()

    await user.type(screen.getByLabelText('Nom'), 'kane')
    await user.type(screen.getByLabelText('Mot de passe'), 'secret')
    await user.click(screen.getByRole('button', { name: 'Entrer' }))

    expect(await screen.findByRole('heading', { name: 'LIFE RPG' })).toBeInTheDocument()
    expect(getToken()).toBe('jeton-abs')
  })

  it('affiche le message d’erreur de l’API', async () => {
    const user = userEvent.setup()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(400, { detail: 'Ton compte est suspendu.' })),
    )
    renderPage()

    await user.type(screen.getByLabelText('Nom'), 'kane')
    await user.type(screen.getByLabelText('Mot de passe'), 'mauvais')
    await user.click(screen.getByRole('button', { name: 'Entrer' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Ton compte est suspendu.')
    expect(getToken()).toBeNull()
  })

  it('affiche un message par défaut sans détail de l’API', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(400, {})))
    renderPage()

    await user.type(screen.getByLabelText('Nom'), 'kane')
    await user.type(screen.getByLabelText('Mot de passe'), 'mauvais')
    await user.click(screen.getByRole('button', { name: 'Entrer' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Identifiants incorrects.')
  })
})
