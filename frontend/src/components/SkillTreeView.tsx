import { useRef } from 'react'
import type { CSSProperties, KeyboardEvent } from 'react'
import { SKILL_STATE_LABELS, TERRITORY_BY_CODE } from '../lib/labels'
import type { SkillNode, SkillTree } from '../lib/types'

type SkillTreeViewProps = {
  tree: SkillTree
  selectedCode?: string | null
  onSelect: (node: SkillNode) => void
}

function nodeLabel(node: SkillNode): string {
  const points = node.cost > 1 ? 'points' : 'point'
  return `${node.name}, niveau ${node.tier}, ${SKILL_STATE_LABELS[node.state].toLowerCase()}, coût ${node.cost} ${points}`
}

export function SkillTreeView({ tree, selectedCode, onSelect }: SkillTreeViewProps) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({})

  const branches = tree.branches ?? []

  function focusNode(branchIndex: number, tierIndex: number) {
    const branch = branches[branchIndex]
    const node = branch?.skills?.[tierIndex]
    if (node) {
      refs.current[node.code]?.focus()
    }
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    branchIndex: number,
    tierIndex: number,
  ) {
    let nextBranch = branchIndex
    let nextTier = tierIndex
    if (event.key === 'ArrowUp') {
      nextTier = Math.max(0, tierIndex - 1)
    } else if (event.key === 'ArrowDown') {
      nextTier = Math.min(3, tierIndex + 1)
    } else if (event.key === 'ArrowLeft') {
      nextBranch = Math.max(0, branchIndex - 1)
    } else if (event.key === 'ArrowRight') {
      nextBranch = Math.min(branches.length - 1, branchIndex + 1)
    } else {
      return
    }
    if (nextBranch === branchIndex && nextTier === tierIndex) {
      return
    }
    event.preventDefault()
    focusNode(nextBranch, nextTier)
  }

  return (
    <section
      className="lr-skill-tree"
      aria-label={`Arbre de compétences ${tree.name}`}
      style={{ '--c': tree.color } as CSSProperties}
    >
      <header className="lr-skill-tree-head">
        <p className="lr-detail-code">{TERRITORY_BY_CODE[tree.territory].statCode}</p>
        <h3 className="lr-form-title">{tree.name}</h3>
      </header>
      <div className="lr-skill-branches" role="group" aria-label="Branches">
        {branches.map((branch, branchIndex) => (
          <div key={branch.code} className="lr-skill-branch">
            <div className="lr-skill-branch-head">
              <p className="lr-skill-branch-name">{branch.name}</p>
              <p className="lr-note">
                <span className="num">{branch.validated_quests}</span> validations
              </p>
            </div>
            <div className="lr-skill-nodes">
              {(branch.skills ?? []).map((node, tierIndex) => {
                const selected = selectedCode === node.code
                return (
                  <div key={node.code} className="lr-skill-node-wrap">
                    {tierIndex > 0 ? <span className="lr-skill-link" aria-hidden="true" /> : null}
                    <button
                      ref={(element) => {
                        refs.current[node.code] = element
                      }}
                      type="button"
                      className={[
                        'lr-skill-node',
                        `lr-skill-node--${node.state.toLowerCase()}`,
                        selected ? 'is-selected' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      aria-label={nodeLabel(node)}
                      aria-pressed={selected}
                      onClick={() => onSelect(node)}
                      onKeyDown={(event) => handleKeyDown(event, branchIndex, tierIndex)}
                    >
                      <span className="lr-skill-node-tier num">{node.tier}</span>
                      <span className="lr-skill-node-name">{node.name}</span>
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
