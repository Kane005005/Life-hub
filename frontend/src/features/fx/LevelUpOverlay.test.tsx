import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LevelUpOverlay } from './LevelUpOverlay'

describe('LevelUpOverlay', () => {
  it('affiche le niveau et le message renvoyés par l’API', () => {
    render(
      <LevelUpOverlay
        level={8}
        message="Niveau 8 atteint. 450 XP pour le suivant."
        onClose={vi.fn()}
      />,
    )

    const dialog = screen.getByRole('dialog', { name: 'Niveau atteint' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByText('8')).toBeInTheDocument()
    expect(screen.getByText('Niveau 8 atteint. 450 XP pour le suivant.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continuer' })).toHaveFocus()
  })

  it('se ferme avec Échap', () => {
    const onClose = vi.fn()
    render(<LevelUpOverlay level={4} message="Niveau 4 atteint." onClose={onClose} />)

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('se ferme avec le bouton Continuer', () => {
    const onClose = vi.fn()
    render(<LevelUpOverlay level={4} message="Niveau 4 atteint." onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
