import type { EnergyLevel } from '../lib/types'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeEnergyCheckIn } from '../test/fixtures'
import { TestProviders } from '../test/TestProviders'
import { EnergyCheckIn } from './EnergyCheckIn'

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

describe('EnergyCheckIn', () => {
  it('enregistre le niveau choisi au clavier dans le radiogroupe', async () => {
    const user = userEvent.setup()
    const stored = makeEnergyCheckIn()
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url === '/api/energy/' && (init?.method ?? 'GET') === 'GET') {
        return Promise.resolve(
          jsonResponse(200, { count: 1, next: null, previous: null, results: [stored] }),
        )
      }
      if (url === '/api/energy/' && init?.method === 'POST') {
        const body = JSON.parse(init.body as string) as { level: EnergyLevel; note: string }
        return Promise.resolve(jsonResponse(201, makeEnergyCheckIn(body)))
      }
      return Promise.resolve(
        jsonResponse(200, { count: 0, next: null, previous: null, results: [] }),
      )
    })
    vi.stubGlobal('fetch', fetchMock)

    render(
      <TestProviders>
        <EnergyCheckIn />
      </TestProviders>,
    )

    expect(await screen.findByText(/Aujourd’hui : Faible/)).toBeInTheDocument()
    const group = screen.getByRole('radiogroup', { name: 'Énergie du jour' })
    const radios = within(group).getAllByRole('radio')
    expect(radios).toHaveLength(5)

    await user.click(radios[0])
    await user.keyboard('{ArrowRight}')
    expect(radios[1]).toBeChecked()

    await user.type(screen.getByLabelText('Note (facultative)'), 'Récupération')
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(
        ([url, init]) =>
          url === '/api/energy/' && (init as RequestInit | undefined)?.method === 'POST',
      )
      expect(call).toBeDefined()
      const body = JSON.parse((call?.[1] as RequestInit).body as string) as Record<string, unknown>
      expect(body.level).toBe(2)
      expect(body.note).toBe('Récupération')
    })
    expect(await screen.findByText('Bilan énergétique enregistré.')).toBeInTheDocument()
  })
})
