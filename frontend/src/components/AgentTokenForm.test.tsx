import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeAgentToken } from '../test/fixtures'
import { TestProviders } from '../test/TestProviders'
import { AgentTokenForm } from './AgentTokenForm'

const SECRET = 'lra_secret_affiche_une_seule_fois'

function jsonResponse(status: number, body?: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }
}

function mockApi() {
  const fetchMock = vi.fn().mockImplementation((url: string) => {
    if (url === '/api/auth/agent-tokens/') {
      return Promise.resolve(
        jsonResponse(201, {
          ...makeAgentToken(),
          token: SECRET,
          scopes: ['profile', 'progression', 'quests', 'proposals'],
        }),
      )
    }
    return Promise.resolve(jsonResponse(200, []))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('AgentTokenForm', () => {
  it('part des portées sûres puis affiche le secret une seule fois', async () => {
    const user = userEvent.setup()
    const fetchMock = mockApi()
    const setItem = vi.spyOn(Storage.prototype, 'setItem')

    render(
      <TestProviders>
        <AgentTokenForm />
      </TestProviders>,
    )

    expect(screen.getByRole('checkbox', { name: /^Profil/ })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /^Progression/ })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /^Missions/ })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /^Corps/ })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: /^Propositions/ })).not.toBeChecked()

    await user.type(screen.getByLabelText('Nom de l’agent'), 'Claude Code')
    await user.click(screen.getByRole('checkbox', { name: /^Propositions/ }))
    await user.click(screen.getByRole('button', { name: 'Créer le jeton' }))

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(
        ([url, init]) =>
          url === '/api/auth/agent-tokens/' && (init as RequestInit | undefined)?.method === 'POST',
      )
      expect(call).toBeDefined()
      const body = JSON.parse((call?.[1] as RequestInit).body as string) as Record<string, unknown>
      expect(body.name).toBe('Claude Code')
      expect(body.scopes).toEqual(['profile', 'progression', 'quests', 'proposals'])
    })

    expect(await screen.findByText(SECRET)).toBeInTheDocument()
    expect(
      screen.getByText('Ce jeton ne sera plus jamais affiché. Copie-le maintenant.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copier' })).toBeInTheDocument()

    const storedSecret = setItem.mock.calls.some(([, value]) => String(value).includes(SECRET))
    expect(storedSecret).toBe(false)
    expect(window.localStorage.getItem('lr-sound')).not.toBe(SECRET)

    await user.click(screen.getByRole('button', { name: 'Fermer' }))
    expect(screen.queryByText(SECRET)).not.toBeInTheDocument()
  })
})
