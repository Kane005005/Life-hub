import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { TopBar } from './TopBar'

const LABELS = [
  'Monde',
  'Héros',
  'Missions',
  'Calendrier',
  'Game Master',
  'Boutique',
  'Saisons',
  'Journal',
  'Réglages',
]

function renderTopBar(soundEnabled: boolean, onToggleSound = vi.fn(), pendingProposals = 0) {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <TopBar
        level={7}
        xp={214}
        xpRequired={400}
        soundEnabled={soundEnabled}
        onToggleSound={onToggleSound}
        pendingProposals={pendingProposals}
      />
    </MemoryRouter>,
  )
}

describe('TopBar', () => {
  it('affiche les neuf liens de navigation', () => {
    renderTopBar(false)

    const nav = screen.getByRole('navigation', { name: 'Navigation principale' })
    expect(within(nav).getAllByRole('link')).toHaveLength(9)

    LABELS.forEach((label) => {
      expect(within(nav).getByRole('link', { name: label })).toBeInTheDocument()
    })
  })

  it('marque le lien actif avec aria-current="page"', () => {
    renderTopBar(false)

    const nav = screen.getByRole('navigation', { name: 'Navigation principale' })
    expect(within(nav).getByRole('link', { name: 'Monde' })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByRole('link', { name: 'Missions' })).not.toHaveAttribute('aria-current')
  })

  it('annonce les propositions en attente dans le lien Game Master', () => {
    renderTopBar(false, vi.fn(), 3)

    const nav = screen.getByRole('navigation', { name: 'Navigation principale' })
    expect(
      within(nav).getByRole('link', { name: 'Game Master, 3 propositions en attente' }),
    ).toHaveAttribute('href', '/game-master')
    expect(within(nav).getByText('3')).toBeInTheDocument()
  })

  it('accorde le nom au singulier pour une seule proposition', () => {
    renderTopBar(false, vi.fn(), 1)

    const nav = screen.getByRole('navigation', { name: 'Navigation principale' })
    expect(
      within(nav).getByRole('link', { name: 'Game Master, 1 proposition en attente' }),
    ).toBeInTheDocument()
  })

  it('appelle onToggleSound et reflète aria-pressed', async () => {
    const user = userEvent.setup()
    const onToggleSound = vi.fn()
    const { rerender } = renderTopBar(false, onToggleSound)

    const off = screen.getByRole('button', { name: 'Son : non' })
    expect(off).toHaveAttribute('aria-pressed', 'false')

    await user.click(off)
    expect(onToggleSound).toHaveBeenCalledTimes(1)

    rerender(
      <MemoryRouter initialEntries={['/']}>
        <TopBar level={7} xp={214} xpRequired={400} soundEnabled onToggleSound={onToggleSound} />
      </MemoryRouter>,
    )

    expect(screen.getByRole('button', { name: 'Son : oui' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })
})
