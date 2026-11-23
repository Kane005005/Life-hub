import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeSkillNode } from '../test/fixtures'
import { TestProviders } from '../test/TestProviders'
import { SkillDetail } from './SkillDetail'

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

describe('SkillDetail', () => {
  it('désactive le déblocage si la compétence est verrouillée et affiche les manques', () => {
    render(
      <TestProviders>
        <SkillDetail
          node={makeSkillNode({
            state: 'LOCKED',
            unlocked_at: null,
            missing: ['Débloque d’abord Lecteur régulier.'],
          })}
        />
      </TestProviders>,
    )

    expect(screen.getByRole('button', { name: /Débloquer/i })).toBeDisabled()
    expect(screen.getByText('Débloque d’abord Lecteur régulier.')).toBeInTheDocument()
  })

  it('débloque une compétence et annonce le message', async () => {
    const user = userEvent.setup()
    const announce = vi.fn()
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        skill: makeSkillNode({ state: 'UNLOCKED' }),
        skill_points: { available: 1, spent: 1 },
        message: 'Compétence débloquée : Lecteur régulier.',
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    render(
      <TestProviders fx={{ announce }}>
        <SkillDetail
          node={makeSkillNode({
            code: 'knowledge.reading.t1',
            state: 'UNLOCKABLE',
            unlocked_at: null,
          })}
        />
      </TestProviders>,
    )

    await user.click(screen.getByRole('button', { name: /Débloquer \(1 point\)/i }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/skills/knowledge.reading.t1/unlock/',
        expect.objectContaining({ method: 'POST' }),
      )
    })
    expect(announce).toHaveBeenCalledWith('Compétence débloquée : Lecteur régulier.')
  })

  it('affiche une erreur 400 dans un role alert', async () => {
    const user = userEvent.setup()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(400, { detail: 'Il te manque 2 points.' })),
    )

    render(
      <TestProviders>
        <SkillDetail
          node={makeSkillNode({
            code: 'knowledge.reading.t2',
            state: 'UNLOCKABLE',
            unlocked_at: null,
            cost: 1,
          })}
        />
      </TestProviders>,
    )

    await user.click(screen.getByRole('button', { name: /Débloquer/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Il te manque 2 points.')
  })
})
