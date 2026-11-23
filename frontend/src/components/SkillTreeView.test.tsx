import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeSkillTree } from '../test/fixtures'
import { TestProviders } from '../test/TestProviders'
import { SkillTreeView } from './SkillTreeView'

function matchMediaStub(matches: boolean) {
  return vi.fn().mockReturnValue({
    matches,
    media: '(prefers-reduced-motion: reduce)',
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onchange: null,
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

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

  it('applique la classe correspondant à chaque état', () => {
    render(<SkillTreeView tree={makeSkillTree()} onSelect={vi.fn()} />)

    expect(screen.getByRole('button', { name: /Lecteur régulier/ })).toHaveClass(
      'lr-skill-node--unlocked',
    )
    expect(screen.getByRole('button', { name: /Lecteur critique/ })).toHaveClass(
      'lr-skill-node--unlockable',
    )
    expect(screen.getByRole('button', { name: /Fiches et synthèses/ })).toHaveClass(
      'lr-skill-node--locked',
    )
  })

  it('pose une classe d’énergie sur les liaisons sortant d’un nœud débloqué', () => {
    const { container } = render(<SkillTreeView tree={makeSkillTree()} onSelect={vi.fn()} />)

    expect(container.querySelectorAll('.lr-skill-link--energy')).toHaveLength(1)
  })

  it('éveille un nœud qui passe de verrouillé à débloquable entre deux rendus', () => {
    const tree = makeSkillTree()
    const { rerender } = render(<SkillTreeView tree={tree} onSelect={vi.fn()} />)
    const target = screen.getByRole('button', { name: /Conversation courante/ })
    expect(target).not.toHaveClass('lr-skill-node--awaken')

    const nextTree = makeSkillTree({
      branches: tree.branches.map((branch) => ({
        ...branch,
        skills: branch.skills.map((skill) =>
          skill.code === 'knowledge.languages.t2'
            ? { ...skill, state: 'UNLOCKABLE' as const, missing: [] }
            : skill,
        ),
      })),
    })
    rerender(<SkillTreeView tree={nextTree} onSelect={vi.fn()} />)

    expect(screen.getByRole('button', { name: /Conversation courante/ })).toHaveClass(
      'lr-skill-node--awaken',
    )
  })

  it('n’ajoute ni éclat ni onde ni braises en mouvement réduit', () => {
    vi.stubGlobal('matchMedia', matchMediaStub(true))
    const burst = vi.fn()
    const { container } = render(
      <TestProviders fx={{ burst }}>
        <SkillTreeView
          tree={makeSkillTree()}
          onSelect={vi.fn()}
          celebratingCode="knowledge.reading.t1"
          celebrationKey={1}
        />
      </TestProviders>,
    )

    expect(burst).not.toHaveBeenCalled()
    expect(container.querySelector('.lr-skill-node--flash')).toBeNull()
    expect(container.querySelector('.lr-skill-node--wave')).toBeNull()
  })
})
