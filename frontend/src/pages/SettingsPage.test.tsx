import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SoundProvider } from '../features/fx/SoundProvider'
import { isSoundEnabled, setSoundEnabled } from '../features/fx/sound'
import { clearToken, setToken } from '../lib/auth'
import { todayIso } from '../test/fixtures'
import { TestProviders } from '../test/TestProviders'
import { SettingsPage } from './SettingsPage'

const originalCreateObjectURL = URL.createObjectURL
const originalRevokeObjectURL = URL.revokeObjectURL

function jsonResponse(status: number, body?: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }
}

function mockApi() {
  const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
    if (url === '/api/auth/agent-tokens/') {
      return Promise.resolve(jsonResponse(200, []))
    }
    if (url === '/api/export/') {
      return Promise.resolve({
        ok: true,
        status: 200,
        blob: async () => new Blob(['{"ok":true}'], { type: 'application/json' }),
      })
    }
    if (url === '/api/auth/logout/' && init?.method === 'POST') {
      return Promise.resolve(jsonResponse(204))
    }
    return Promise.resolve(jsonResponse(200, {}))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderSettings() {
  return render(
    <TestProviders>
      <SoundProvider>
        <SettingsPage />
      </SoundProvider>
    </TestProviders>,
  )
}

beforeEach(() => {
  window.localStorage.clear()
  setSoundEnabled(false)
})

afterEach(() => {
  URL.createObjectURL = originalCreateObjectURL
  URL.revokeObjectURL = originalRevokeObjectURL
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  setSoundEnabled(false)
  clearToken()
})

describe('SettingsPage', () => {
  it('présente les cinq sections et partage le réglage du son', async () => {
    const user = userEvent.setup()
    mockApi()

    renderSettings()

    expect(screen.getByText('08 · Réglages')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Réglages', level: 1 })).toBeInTheDocument()
    for (const title of ['Fuseau horaire', 'Agents', 'Son', 'Sauvegarde', 'Export', 'Compte']) {
      expect(screen.getByRole('heading', { name: title, level: 2 })).toBeInTheDocument()
    }
    expect(screen.getByText('Voir docs/AGENTS.md dans le dépôt')).toBeInTheDocument()
    expect(
      screen.getByText(
        "Lance make backup dans le dossier du projet. Chaque sauvegarde est datée et n'efface jamais les précédentes.",
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Télécharger mes données' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Quitter' })).toBeInTheDocument()

    const off = screen.getByRole('button', { name: 'Son : non' })
    expect(off).toHaveAttribute('aria-pressed', 'false')
    await user.click(off)
    expect(await screen.findByRole('button', { name: 'Son : oui' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(window.localStorage.getItem('lr-sound')).toBe('true')
    expect(isSoundEnabled()).toBe(true)
  })

  it('télécharge un export JSON daté avec le jeton utilisateur', async () => {
    const user = userEvent.setup()
    setToken('jeton-abs')
    const fetchMock = mockApi()
    let downloadedName = ''
    URL.createObjectURL = vi.fn(() => 'blob:export') as typeof URL.createObjectURL
    URL.revokeObjectURL = vi.fn() as typeof URL.revokeObjectURL
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      downloadedName = this.download
    })

    renderSettings()
    await user.click(screen.getByRole('button', { name: 'Télécharger mes données' }))

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([url]) => url === '/api/export/')
      expect(call).toBeDefined()
      const init = call?.[1] as RequestInit | undefined
      const headers = init?.headers as Record<string, string> | undefined
      expect(headers?.Authorization).toBe('Token jeton-abs')
    })
    expect(downloadedName).toBe(`life-rpg-export-${todayIso()}.json`)
    expect(URL.createObjectURL).toHaveBeenCalled()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:export')
    expect(await screen.findByText('Export téléchargé.')).toBeInTheDocument()
  })

  it('enregistre le fuseau horaire via /api/auth/me/', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url === '/api/auth/me/' && init?.method !== 'PATCH') {
        return Promise.resolve(
          jsonResponse(200, { id: 1, username: 'kane', time_zone: 'Africa/Bamako' }),
        )
      }
      if (url === '/api/auth/me/' && init?.method === 'PATCH') {
        return Promise.resolve(
          jsonResponse(200, { id: 1, username: 'kane', time_zone: 'Europe/Paris' }),
        )
      }
      return Promise.resolve(jsonResponse(200, {}))
    })
    vi.stubGlobal('fetch', fetchMock)

    renderSettings()

    const select = await screen.findByRole('combobox', { name: 'Fuseau horaire' })
    expect(select).toHaveValue('Africa/Bamako')
    expect(screen.getByText('Ton jour commence à minuit dans ce fuseau.')).toBeInTheDocument()
    await user.selectOptions(select, 'Europe/Paris')
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(
        ([url, init]) =>
          url === '/api/auth/me/' && (init as RequestInit | undefined)?.method === 'PATCH',
      )
      expect(call).toBeDefined()
      const body = JSON.parse((call?.[1] as RequestInit).body as string) as Record<string, unknown>
      expect(body).toEqual({ time_zone: 'Europe/Paris' })
    })
    expect(await screen.findByText('Fuseau horaire enregistré.')).toBeInTheDocument()
  })

  it('déconnecte depuis le bouton Quitter', async () => {
    const user = userEvent.setup()
    const fetchMock = mockApi()

    renderSettings()
    await user.click(screen.getByRole('button', { name: 'Quitter' }))

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          ([url, init]) =>
            url === '/api/auth/logout/' && (init as RequestInit | undefined)?.method === 'POST',
        ),
      ).toBe(true)
    })
  })
})
