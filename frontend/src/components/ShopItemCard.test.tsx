import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeShopItem } from '../test/fixtures'
import { TestProviders } from '../test/TestProviders'
import { ShopItemCard } from './ShopItemCard'

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

describe('ShopItemCard', () => {
  it('achète un objet et annonce le message', async () => {
    const user = userEvent.setup()
    const announce = vi.fn()
    const toast = vi.fn()
    const item = makeShopItem()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(200, {
          item: { ...item, owned: true },
          credits: 450,
          message: "Récompense obtenue : Aura d'émeraude. -150 crédits.",
        }),
      ),
    )

    render(
      <TestProviders fx={{ announce, toast }}>
        <ShopItemCard item={item} />
      </TestProviders>,
    )

    await user.click(screen.getByRole('button', { name: 'Acheter' }))
    await waitFor(() => {
      expect(announce).toHaveBeenCalledWith("Récompense obtenue : Aura d'émeraude. -150 crédits.")
    })
    expect(toast).toHaveBeenCalled()
  })

  it('affiche une erreur 400 de crédits insuffisants', async () => {
    const user = userEvent.setup()
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse(400, { detail: 'Crédits insuffisants : il te manque 120 crédits.' }),
        ),
    )

    render(
      <TestProviders>
        <ShopItemCard item={makeShopItem()} />
      </TestProviders>,
    )

    await user.click(screen.getByRole('button', { name: 'Acheter' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Crédits insuffisants : il te manque 120 crédits.',
    )
  })

  it('empêche de racheter un artefact possédé et permet d’équiper', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, {}))
    vi.stubGlobal('fetch', fetchMock)

    render(
      <TestProviders>
        <ShopItemCard item={makeShopItem({ owned: true, equipped: false })} />
      </TestProviders>,
    )

    expect(screen.getByRole('button', { name: 'Possédé' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Équiper' }))
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/economy/inventory/4/equip/',
        expect.objectContaining({ method: 'POST' }),
      )
    })
  })
})
