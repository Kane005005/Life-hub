import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, MutableRefObject, ReactNode } from 'react'
import { prefersReducedMotion } from '../features/fx/motion'
import { useFx } from '../features/fx/useFx'
import { SKILL_STATE_LABELS, TERRITORY_BY_CODE } from '../lib/labels'
import type { SkillBranch, SkillNode, SkillTree, TerritoryStatCode } from '../lib/types'
import '../styles/skill-tree.css'
import { SkillConstellation } from './SkillConstellation'
import { SkillTooltip } from './SkillTooltip'

type SkillTreeViewProps = {
  tree: SkillTree
  selectedCode?: string | null
  onSelect: (node: SkillNode) => void
  celebratingCode?: string | null
  celebrationKey?: number
  nodeRefs?: MutableRefObject<Record<string, HTMLButtonElement | null>>
}

const VIEW_WIDTH = 720
const VIEW_HEIGHT = 630
const COLUMN_X = [120, 360, 600]
const NODE_Y = [110, 255, 400, 545]
const HEX_RADIUS = 40
const HALO_RADIUS = 50
const TOOLTIP_ID = 'lr-skill-tooltip'

function nodeLabel(node: SkillNode): string {
  const points = node.cost > 1 ? 'points' : 'point'
  return `${node.name}, niveau ${node.tier}, ${SKILL_STATE_LABELS[node.state].toLowerCase()}, coût ${node.cost} ${points}`
}

// Noms de classes écrits en entier : Tailwind supprime les classes construites dynamiquement.
const NODE_STATE_CLASS: Record<SkillNode['state'], string> = {
  LOCKED: 'lr-skill-node--locked',
  UNLOCKABLE: 'lr-skill-node--unlockable',
  UNLOCKED: 'lr-skill-node--unlocked',
}

const TERRITORY_GLYPHS: Record<TerritoryStatCode, ReactNode> = {
  INT: (
    <>
      <path d="M4 19 L12 5 L20 19 Z" />
      <circle cx="12" cy="14.5" r="1.6" />
    </>
  ),
  VIT: <path d="M3 12 H8 L10.5 6 L13.5 18 L16 12 H21" />,
  INF: <path d="M4 19 H9 V14 H14 V9 H19 V4" />,
  TEC: <path d="M8 6 L3 12 L8 18 M16 6 L21 12 L16 18 M13.5 5 L10.5 19" />,
  CRE: <path d="M12 3 L14 10 L21 12 L14 14 L12 21 L10 14 L3 12 L10 10 Z" />,
  SAG: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="2.4" />
    </>
  ),
}

function hexPoints(cx: number, cy: number, radius: number): string {
  return Array.from({ length: 6 }, (_, index) => {
    const angle = ((-90 + index * 60) * Math.PI) / 180
    return `${(cx + Math.cos(angle) * radius).toFixed(1)},${(cy + Math.sin(angle) * radius).toFixed(1)}`
  }).join(' ')
}

function truncate(text: string, maximum: number): string {
  if (text.length <= maximum) {
    return text
  }
  return `${text.slice(0, maximum - 1).trimEnd()}…`
}

function nameLines(name: string): string[] {
  const words = name.split(' ').filter(Boolean)
  const lines: string[] = []
  let current = ''
  words.forEach((word) => {
    if (!current) {
      current = word
    } else if (`${current} ${word}`.length <= 18) {
      current = `${current} ${word}`
    } else {
      lines.push(current)
      current = word
    }
  })
  if (current) {
    lines.push(current)
  }
  const first = truncate(lines[0] ?? name, 18)
  const second = lines.length > 1 ? truncate(lines.slice(1).join(' '), 18) : ''
  return second ? [first, second] : [first]
}

function emberColor(color: string): string {
  const raw = color.replace('#', '')
  const hex =
    raw.length === 3
      ? raw
          .split('')
          .map((character) => character + character)
          .join('')
      : raw
  if (!/^[0-9a-f]{6}$/i.test(hex)) {
    return '47,208,139'
  }
  const value = parseInt(hex, 16)
  return `${(value >> 16) & 255},${(value >> 8) & 255},${value & 255}`
}

type TooltipTarget = {
  node: SkillNode
  branchIndex: number
  tierIndex: number
}

export function SkillTreeView({
  tree,
  selectedCode,
  onSelect,
  celebratingCode,
  celebrationKey,
  nodeRefs,
}: SkillTreeViewProps) {
  const { burst } = useFx()
  const localRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const refs = nodeRefs ?? localRefs
  const previousStates = useRef<Record<string, SkillNode['state']>>({})
  const hasMounted = useRef(false)
  const awakenTimers = useRef<Record<string, number>>({})
  const [awakenedCodes, setAwakenedCodes] = useState<Record<string, boolean>>({})
  const [flashCode, setFlashCode] = useState<string | null>(null)
  const [waveCode, setWaveCode] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<TooltipTarget | null>(null)

  const branches = tree.branches ?? []

  const skillNames = useMemo(() => {
    const names = new Map<string, string>()
    branches.forEach((branch) => {
      branch.skills.forEach((skill) => names.set(skill.code, skill.name))
    })
    return names
  }, [branches])

  useEffect(() => {
    const states: Record<string, SkillNode['state']> = {}
    ;(tree.branches ?? []).forEach((branch) => {
      branch.skills.forEach((skill) => {
        states[skill.code] = skill.state
      })
    })

    if (hasMounted.current) {
      Object.entries(states).forEach(([code, state]) => {
        if (previousStates.current[code] === 'LOCKED' && state === 'UNLOCKABLE') {
          setAwakenedCodes((current) => ({ ...current, [code]: true }))
          if (awakenTimers.current[code] !== undefined) {
            window.clearTimeout(awakenTimers.current[code])
          }
          awakenTimers.current[code] = window.setTimeout(() => {
            setAwakenedCodes((current) => ({ ...current, [code]: false }))
            delete awakenTimers.current[code]
          }, 900)
        }
      })
    }

    hasMounted.current = true
    previousStates.current = states
  }, [tree])

  useEffect(
    () => () => {
      Object.values(awakenTimers.current).forEach((timer) => window.clearTimeout(timer))
    },
    [],
  )

  useEffect(() => {
    if (!celebratingCode || !celebrationKey || prefersReducedMotion()) {
      return
    }
    const code = celebratingCode
    setFlashCode(code)
    setWaveCode(code)

    const element = refs.current[code]
    const rect =
      element && typeof element.getBoundingClientRect === 'function'
        ? element.getBoundingClientRect()
        : null
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2
    const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2
    burst(x, y, 24, emberColor(tree.color))

    const flashTimer = window.setTimeout(() => setFlashCode(null), 240)
    const waveTimer = window.setTimeout(() => setWaveCode(null), 600)
    return () => {
      window.clearTimeout(flashTimer)
      window.clearTimeout(waveTimer)
    }
  }, [burst, celebratingCode, celebrationKey, refs, tree.color])

  function focusNode(branchIndex: number, tierIndex: number) {
    const node = branches[branchIndex]?.skills?.[tierIndex]
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

  function showTooltip(node: SkillNode, branchIndex: number, tierIndex: number) {
    setTooltip({ node, branchIndex, tierIndex })
  }

  function hideTooltip(code: string) {
    setTooltip((current) => (current?.node.code === code ? null : current))
  }

  const statCode = TERRITORY_BY_CODE[tree.territory].statCode

  return (
    <section
      className="lr-skill-tree"
      aria-label={`Arbre de compétences ${tree.name}`}
      style={{ '--c': tree.color } as CSSProperties}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && tooltip) {
          event.preventDefault()
          setTooltip(null)
        }
      }}
    >
      <header className="lr-skill-tree-head">
        <p className="lr-detail-code">{statCode}</p>
        <h3 className="lr-form-title">{tree.name}</h3>
      </header>

      <div className="lr-skill-branches-head" role="group" aria-label="Branches">
        {branches.map((branch: SkillBranch) => (
          <div key={branch.code} className="lr-skill-branch-head">
            <p className="lr-skill-branch-name">{branch.name}</p>
            <p className="lr-skill-branch-count">
              <span className="num">{branch.validated_quests}</span>{' '}
              {branch.validated_quests > 1 ? 'validations' : 'validation'}
            </p>
          </div>
        ))}
      </div>

      <div className="lr-skill-canvas">
        <SkillConstellation territory={tree.territory} color={tree.color} />
        <svg
          className="lr-skill-svg"
          viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
          aria-hidden="true"
          focusable="false"
        >
          <g>
            {branches.flatMap((branch, branchIndex) =>
              branch.skills.slice(0, -1).map((node, tierIndex) => {
                const next = branch.skills[tierIndex + 1]
                const x = COLUMN_X[branchIndex]
                const y1 = NODE_Y[tierIndex] + HEX_RADIUS + 8
                const y2 = NODE_Y[tierIndex + 1] - HEX_RADIUS - 8
                const dimmed = next.state === 'LOCKED'
                const awakened = awakenedCodes[next.code] === true
                const className = [
                  'lr-skill-link',
                  dimmed ? 'lr-skill-link--dim' : '',
                  awakened ? 'lr-skill-link--awaken' : '',
                ]
                  .filter(Boolean)
                  .join(' ')
                return (
                  <g key={`${node.code}-${next.code}`}>
                    <line className={className} x1={x} y1={y1} x2={x} y2={y2} />
                    {node.state === 'UNLOCKED' ? (
                      <line
                        className="lr-skill-link lr-skill-link--energy"
                        x1={x}
                        y1={y1}
                        x2={x}
                        y2={y2}
                      />
                    ) : null}
                  </g>
                )
              }),
            )}
          </g>
          {branches.map((branch, branchIndex) =>
            branch.skills.map((node, tierIndex) => {
              const x = COLUMN_X[branchIndex]
              const y = NODE_Y[tierIndex]
              const selected = selectedCode === node.code
              const awakened = awakenedCodes[node.code] === true
              const visualClass = [
                'lr-skill-node-visual',
                NODE_STATE_CLASS[node.state],
                selected ? 'is-selected' : '',
                awakened ? 'lr-skill-node--awaken' : '',
                flashCode === node.code ? 'lr-skill-node--flash' : '',
                waveCode === node.code ? 'lr-skill-node--wave' : '',
              ]
                .filter(Boolean)
                .join(' ')
              const lines = nameLines(node.name)
              return (
                <g key={node.code} className={visualClass}>
                  <polygon
                    className="lr-skill-node-selection"
                    points={hexPoints(x, y, HEX_RADIUS + 9)}
                  />
                  <polygon className="lr-skill-node-halo" points={hexPoints(x, y, HALO_RADIUS)} />
                  <polygon className="lr-skill-node-hex" points={hexPoints(x, y, HEX_RADIUS)} />
                  <g
                    className="lr-skill-glyph"
                    transform={`translate(${x - 11} ${y - 22}) scale(0.9)`}
                  >
                    {TERRITORY_GLYPHS[statCode]}
                  </g>
                  <text className="lr-skill-node-tier" x={x} y={y + 15}>
                    {node.tier}
                  </text>
                  <text className="lr-skill-node-name-line" x={x} y={y + 62}>
                    {lines[0]}
                  </text>
                  {lines[1] ? (
                    <text className="lr-skill-node-name-line" x={x} y={y + 78}>
                      {lines[1]}
                    </text>
                  ) : null}
                  <polygon className="lr-skill-node-flash" points={hexPoints(x, y, HEX_RADIUS)} />
                  <circle className="lr-skill-node-wave" cx={x} cy={y} r={HEX_RADIUS} />
                </g>
              )
            }),
          )}
        </svg>

        <div className="lr-skill-hits">
          {branches.map((branch, branchIndex) =>
            branch.skills.map((node, tierIndex) => {
              const selected = selectedCode === node.code
              const awakened = awakenedCodes[node.code] === true
              const className = [
                'lr-skill-node',
                'lr-skill-node-hit',
                NODE_STATE_CLASS[node.state],
                selected ? 'is-selected' : '',
                awakened ? 'lr-skill-node--awaken' : '',
              ]
                .filter(Boolean)
                .join(' ')
              return (
                <button
                  key={node.code}
                  ref={(element) => {
                    refs.current[node.code] = element
                  }}
                  type="button"
                  className={className}
                  style={{
                    left: `${(COLUMN_X[branchIndex] / VIEW_WIDTH) * 100}%`,
                    top: `${(NODE_Y[tierIndex] / VIEW_HEIGHT) * 100}%`,
                    width: `${(100 / VIEW_WIDTH) * 100}%`,
                    height: `${(100 / VIEW_HEIGHT) * 100}%`,
                  }}
                  aria-label={nodeLabel(node)}
                  aria-pressed={selected}
                  aria-describedby={tooltip?.node.code === node.code ? TOOLTIP_ID : undefined}
                  onClick={() => onSelect(node)}
                  onKeyDown={(event) => handleKeyDown(event, branchIndex, tierIndex)}
                  onMouseEnter={() => showTooltip(node, branchIndex, tierIndex)}
                  onMouseLeave={() => hideTooltip(node.code)}
                  onFocus={() => showTooltip(node, branchIndex, tierIndex)}
                  onBlur={() => hideTooltip(node.code)}
                />
              )
            }),
          )}
        </div>

        {tooltip ? (
          <SkillTooltip
            id={TOOLTIP_ID}
            node={tooltip.node}
            requirementNames={(tooltip.node.requires ?? []).map(
              (code) => skillNames.get(code) ?? code,
            )}
            left={(COLUMN_X[tooltip.branchIndex] / VIEW_WIDTH) * 100}
            top={(NODE_Y[tooltip.tierIndex] / VIEW_HEIGHT) * 100}
            side={
              tooltip.branchIndex === 0
                ? 'right'
                : tooltip.branchIndex === branches.length - 1
                  ? 'left'
                  : 'above'
            }
          />
        ) : null}
      </div>
    </section>
  )
}
