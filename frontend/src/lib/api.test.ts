import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiRequest } from './api'
import { clearToken, getToken, setToken } from './auth'

function jsonResponse(status: number, body?: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
  clearToken()
})

describe('apiRequest', () => {
  it('envoie le jeton dans l’en-tête Authorization', async () => {
    setToken('cle-de-test')
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { status: 'ok' }))
    vi.stubGlobal('fetch', fetchMock)

    await apiRequest('GET', '/health/')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/health/')
    expect(init.headers).toMatchObject({
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: 'Token cle-de-test',
    })
  })

  it('efface le jeton et émet l’événement sur 401', async () => {
    setToken('cle-perimee')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(401, { detail: 'Connexion nécessaire.' })),
    )
    const listener = vi.fn()
    window.addEventListener('lr:unauthorized', listener)

    try {
      await expect(apiRequest('GET', '/auth/me/')).rejects.toBeInstanceOf(ApiError)
      expect(getToken()).toBeNull()
      expect(listener).toHaveBeenCalledTimes(1)
    } finally {
      window.removeEventListener('lr:unauthorized', listener)
    }
  })

  it('reprend le détail d’erreur du corps JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(409, { detail: 'Mission déjà validée.' })),
    )

    await expect(apiRequest('POST', '/quests/1/complete/', {})).rejects.toMatchObject({
      status: 409,
      detail: 'Mission déjà validée.',
    })
  })

  it('renvoie undefined sur une réponse 204', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(204)))

    await expect(apiRequest('POST', '/auth/logout/', {})).resolves.toBeUndefined()
  })
})
