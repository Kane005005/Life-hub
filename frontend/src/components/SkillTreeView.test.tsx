import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { makeSkillTree } from '../test/fixtures'
import { SkillTreeView } from './SkillTreeView'

describe('SkillTreeView', () => {
  it('affiche 12 nœuds avec un libellé accessible', () => {
    render(<SkillTreeView tree={makeSkillTree()} onSelect={vi.fn()} />)

    const nodes = screen.getAllByRole('button')
    expect(nodes).toHaveLength(12)
    expect(
      screen.getByRole('button', {
        name: /Lecteur critique, niveau 2, débloquable, coût 1 point/i,
      }),
    ).toBeInTheDocument()
  })

  it('déplace le focus au clavier', () => {
    render(<SkillTreeView tree={makeSkillTree()} onSelect={vi.fn()} />)

    const first = screen.getByRole('button', { name: /Lecteur régulier, niveau 1/i })
    first.focus()
    fireEvent.keyDown(first, { key: 'ArrowDown' })
    expect(screen.getByRole('button', { name: /Lecteur critique, niveau 2/i })).toHaveFocus()

    const current = screen.getByRole('button', { name: /Lecteur critique, niveau 2/i })
    fireEvent.keyDown(current, { key: 'ArrowRight' })
    expect(screen.getByRole('button', { name: /Conversation courante, niveau 2/i })).toHaveFocus()
  })
})
