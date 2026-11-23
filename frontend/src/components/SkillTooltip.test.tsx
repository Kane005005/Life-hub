import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { makeSkillTree } from '../test/fixtures'
import { SkillTreeView } from './SkillTreeView'

describe('SkillTooltip', () => {
  it('affiche au focus le nom, le coût, les prérequis et les manques, reliés au nœud', () => {
    render(<SkillTreeView tree={makeSkillTree()} onSelect={vi.fn()} />)

    const node = screen.getByRole('button', { name: /Fiches et synthèses/ })
    fireEvent.focus(node)

    const tooltip = screen.getByRole('tooltip')
    expect(node).toHaveAttribute('aria-describedby', tooltip.id)
    expect(tooltip).toHaveTextContent('Fiches et synthèses')
    expect(tooltip).toHaveTextContent(/niveau 3/i)
    expect(tooltip).toHaveTextContent('2 points')
    expect(tooltip).toHaveTextContent('Lecteur critique')
    expect(tooltip).toHaveTextContent('Débloque d’abord Lecteur critique.')
  })

  it('se ferme avec Échap et à la sortie du focus', () => {
    render(<SkillTreeView tree={makeSkillTree()} onSelect={vi.fn()} />)

    const node = screen.getByRole('button', { name: /Lecteur critique/ })
    fireEvent.focus(node)
    expect(screen.getByRole('tooltip')).toBeInTheDocument()

    fireEvent.keyDown(node, { key: 'Escape' })
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()

    fireEvent.blur(node)
    fireEvent.focus(node)
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
    fireEvent.blur(node)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('indique « Tout est prêt. » ou la date d’acquisition', () => {
    render(<SkillTreeView tree={makeSkillTree()} onSelect={vi.fn()} />)

    fireEvent.focus(screen.getByRole('button', { name: /Lecteur critique/ }))
    expect(screen.getByRole('tooltip')).toHaveTextContent('Tout est prêt.')

    fireEvent.blur(screen.getByRole('button', { name: /Lecteur critique/ }))
    fireEvent.focus(screen.getByRole('button', { name: /Lecteur régulier/ }))
    expect(screen.getByRole('tooltip')).toHaveTextContent(/Acquise le/)
  })
})
