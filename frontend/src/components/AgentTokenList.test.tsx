import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeAgentToken } from '../test/fixtures'
import { TestProviders } from '../test/TestProviders'
import { AgentTokenList } from './AgentTokenList'

function jsonResponse(status: number, body?: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }
}

function mockApi() {
  const active = makeAgentToken({ id: 3, name: 'Claude Code' })
  const revoked = makeAgentToken({
    id: 4,
    name: 'Ancien agent',
    is_active: false,
    revoked_at: '2026-11-22T10:00:00Z',
  })
  let tokens = [active, revoked]
  const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET'
    if (url === '/api/auth/agent-tokens/' && method === 'GET') {
      return Promise.resolve(jsonResponse(200, tokens))
    }
    if (url === '/api/auth/agent-tokens/3/' && method === 'DELETE') {
      tokens = [{ ...active, is_active: false, revoked_at: '2026-11-23T10:00:00Z' }, revoked]
      return Promise.resolve(jsonResponse(204))
    }
    return Promise.resolve(jsonResponse(200, []))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('AgentTokenList', () => {
  it('confirme la révocation avant de supprimer l’accès', async () => {
    const user = userEvent.setup()
    const fetchMock = mockApi()
    const announce = vi.fn()

    render(
      <TestProviders fx={{ announce }}>
        <AgentTokenList />
      </TestProviders>,
    )

    expect(await screen.findByText('Claude Code')).toBeInTheDocument()
    expect(screen.getByText('Ancien agent')).toBeInTheDocument()
    expect(screen.getByText('Actif')).toBeInTheDocument()
    expect(screen.getByText('Révoqué')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Révoquer' }))
    const dialog = await screen.findByRole('dialog', { name: 'Révoquer ce jeton ?' })
    expect(
      within(dialog).getByText("Révoquer ce jeton ? L'agent perdra l'accès immédiatement."),
    ).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Révoquer' }))

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          ([url, init]) =>
            url === '/api/auth/agent-tokens/3/' &&
            (init as RequestInit | undefined)?.method === 'DELETE',
        ),
      ).toBe(true)
    })
    expect(announce).toHaveBeenCalledWith('Jeton révoqué.')
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })
})
