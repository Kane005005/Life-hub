import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeProposal, makeQuest } from '../test/fixtures'
import { TestProviders } from '../test/TestProviders'
import { ProposalCard } from './ProposalCard'

const ACCEPT_MESSAGE =
  "Mission ajoutée à ton journal de quêtes. Elle ne rapporte rien tant que tu ne l'as pas validée."

function jsonResponse(status: number, body?: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }
}

function mockApi() {
  const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET'
    if (url.startsWith('/api/skills/trees/')) {
      return Promise.resolve(jsonResponse(200, []))
    }
    if (url === '/api/quest-proposals/7/accept/' && method === 'POST') {
      return Promise.resolve(
        jsonResponse(200, {
          proposal: makeProposal({ status: 'ACCEPTED' }),
          quest: makeQuest(),
        }),
      )
    }
    if (url === '/api/quest-proposals/7/reject/' && method === 'POST') {
      return Promise.resolve(jsonResponse(200, makeProposal({ status: 'REJECTED' })))
    }
    if (url === '/api/quest-proposals/7/' && method === 'PATCH') {
      return Promise.resolve(jsonResponse(200, makeProposal()))
    }
    return Promise.resolve(jsonResponse(200, makeProposal()))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function findCall(fetchMock: ReturnType<typeof mockApi>, url: string, method: string) {
  return fetchMock.mock.calls.find(
    ([calledUrl, init]) =>
      calledUrl === url && (init as RequestInit | undefined)?.method === method,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ProposalCard', () => {
  it('accepte la proposition et annonce le résultat', async () => {
    const user = userEvent.setup()
    const fetchMock = mockApi()
    const announce = vi.fn()

    render(
      <TestProviders fx={{ announce }}>
        <ProposalCard proposal={makeProposal()} />
      </TestProviders>,
    )

    await user.click(screen.getByRole('button', { name: 'Accepter' }))

    await waitFor(() => {
      expect(findCall(fetchMock, '/api/quest-proposals/7/accept/', 'POST')).toBeDefined()
    })
    expect(await screen.findByText(ACCEPT_MESSAGE)).toBeInTheDocument()
    expect(announce).toHaveBeenCalledWith(ACCEPT_MESSAGE)
  })

  it('envoie les modifications quand la proposition est acceptée après édition', async () => {
    const user = userEvent.setup()
    const fetchMock = mockApi()

    render(
      <TestProviders>
        <ProposalCard proposal={makeProposal()} />
      </TestProviders>,
    )

    await user.click(screen.getByRole('button', { name: 'Modifier' }))
    const title = await screen.findByLabelText('Titre')
    await user.clear(title)
    await user.type(title, 'Lire 30 pages')
    await user.click(screen.getByRole('button', { name: 'Accepter avec ces modifications' }))

    await waitFor(() => {
      const call = findCall(fetchMock, '/api/quest-proposals/7/accept/', 'POST')
      expect(call).toBeDefined()
      const body = JSON.parse((call?.[1] as RequestInit).body as string) as Record<string, unknown>
      expect(body.title).toBe('Lire 30 pages')
      expect(body.skill_branch).toBe('reading')
      expect(body.steps).toEqual([{ title: 'Ouvrir le livre', is_required: true }])
      expect(body).not.toHaveProperty('xp_preview')
      expect(body).not.toHaveProperty('status')
    })
  })

  it('refuse avec un motif facultatif', async () => {
    const user = userEvent.setup()
    const fetchMock = mockApi()

    render(
      <TestProviders>
        <ProposalCard proposal={makeProposal()} />
      </TestProviders>,
    )

    await user.click(screen.getByRole('button', { name: 'Refuser' }))
    const dialog = await screen.findByRole('dialog', { name: 'Refuser cette proposition ?' })
    await user.type(within(dialog).getByLabelText('Motif (facultatif)'), 'Charge trop forte')
    await user.click(within(dialog).getByRole('button', { name: 'Refuser' }))

    await waitFor(() => {
      const call = findCall(fetchMock, '/api/quest-proposals/7/reject/', 'POST')
      expect(call).toBeDefined()
      const body = JSON.parse((call?.[1] as RequestInit).body as string) as Record<string, unknown>
      expect(body.reason).toBe('Charge trop forte')
    })
    expect(await screen.findByText('Proposition refusée.')).toBeInTheDocument()
  })

  it('affiche une proposition décidée sans bouton de décision', () => {
    mockApi()

    render(
      <TestProviders>
        <ProposalCard proposal={makeProposal({ status: 'ACCEPTED' })} />
      </TestProviders>,
    )

    expect(screen.queryByRole('button', { name: 'Accepter' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Modifier' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Refuser' })).not.toBeInTheDocument()
    expect(screen.getByText(/Acceptée le/)).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Voir la mission dans le journal de quêtes' }),
    ).toHaveAttribute('href', '/missions?quest=12')
  })
})
