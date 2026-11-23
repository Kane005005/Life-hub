import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearToken, setToken } from '../lib/auth'
import type { Character } from '../lib/types'
import { makeTerritory } from '../test/fixtures'
import App from './App'

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return {
    pseudonym: 'Kane',
    bio: '',
    character_class: 'ARCHITECT',
    is_onboarded: true,
    level: 3,
    xp_in_level: 40,
    xp_required: 200,
    total_xp: 340,
    rank: { code: 'INITIATE', label: 'Initié' },
    credits: 340,
    skill_points: { available: 2, spent: 0 },
    avatar: { silhouette: 'A', color: '#2FD08B', accent: '#EDE9DF' },
    stats: [],
    ...overrides,
  }
}

function jsonResponse(body: unknown) {
  return { ok: true, status: 200, json: async () => body }
}

function stubApi(character: Character) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation((url: string) => {
      if (url === '/api/character/') {
        return Promise.resolve(jsonResponse(character))
      }
      if (url === '/api/world/territories/') {
        return Promise.resolve(jsonResponse([makeTerritory()]))
      }
      if (url.startsWith('/api/quests/')) {
        return Promise.resolve(jsonResponse({ count: 0, next: null, previous: null, results: [] }))
      }
      return Promise.resolve(jsonResponse({ status: 'ok' }))
    }),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
  clearToken()
  window.history.pushState({}, '', '/')
})

describe('App', () => {
  it('affiche la connexion sans jeton', async () => {
    window.history.pushState({}, '', '/')
    stubApi(makeCharacter())

    render(<App />)

    expect(await screen.findByRole('button', { name: 'Entrer' })).toBeInTheDocument()
  })

  it('affiche la création du personnage quand il n’est pas créé', async () => {
    setToken('jeton-abs')
    window.history.pushState({}, '', '/')
    stubApi(makeCharacter({ is_onboarded: false }))

    render(<App />)

    expect(await screen.findByRole('button', { name: 'Créer mon personnage' })).toBeInTheDocument()
  })

  it('affiche le niveau renvoyé par l’API dans la barre supérieure', async () => {
    setToken('jeton-abs')
    window.history.pushState({}, '', '/')
    stubApi(makeCharacter({ level: 3 }))

    render(<App />)

    expect(await screen.findByText('NIV 3')).toBeInTheDocument()
  })
})
