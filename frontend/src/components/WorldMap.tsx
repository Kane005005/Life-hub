import { useRef } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import type { CssVars } from '../lib/css'
import { TERRITORY_BY_CODE, STATE_LABELS } from '../lib/labels'
import type { TerritoryCode, TerritoryStat } from '../lib/types'

type WorldMapProps = {
  territories: TerritoryStat[]
  selected: TerritoryCode
  onSelect: (code: TerritoryCode) => void
}

const HUB = { x: 450, y: 262 }

const POSITIONS: Record<TerritoryCode, { x: number; y: number }> = {
  KNOWLEDGE: { x: 170, y: 150 },
  BODY: { x: 165, y: 380 },
  CAREER: { x: 450, y: 92 },
  TECHNOLOGY: { x: 450, y: 432 },
  CREATION: { x: 735, y: 150 },
  INNER_WORLD: { x: 740, y: 380 },
}

function hexPoints(cx: number, cy: number, radius: number): string {
  const points: string[] = []
  for (let index = 0; index < 6; index += 1) {
    const angle = ((-90 + 60 * index) * Math.PI) / 180
    points.push(
      `${(cx + Math.cos(angle) * radius).toFixed(1)},${(cy + Math.sin(angle) * radius).toFixed(1)}`,
    )
  }
  return points.join(' ')
}

export function WorldMap({ territories, selected, onSelect }: WorldMapProps) {
  const nodes = useRef<Record<string, SVGGElement | null>>({})

  function handleKeyDown(
    event: ReactKeyboardEvent<SVGGElement>,
    territory: TerritoryStat,
    index: number,
  ) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelect(territory.code)
      return
    }
    const step =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? -1
          : 0
    if (step === 0 || territories.length === 0) {
      return
    }
    event.preventDefault()
    const next = (index + step + territories.length) % territories.length
    nodes.current[territories[next].code]?.focus()
  }

  return (
    <svg
      className="lr-map-svg"
      viewBox="0 0 900 520"
      role="group"
      aria-label="Carte des territoires"
    >
      <defs>
        <pattern id="lr-dots" width="28" height="28" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1" fill="#1d2b25" />
        </pattern>
        <radialGradient id="lr-hub-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#2FD08B" stopOpacity="0.28" />
          <stop offset="1" stopColor="#2FD08B" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="lr-fog" cx="0" cy="0" r="1">
          <stop offset="0" stopColor="#0B100E" stopOpacity="0.9" />
          <stop offset="1" stopColor="#0B100E" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="900" height="520" fill="#0C1512" />
      <rect width="900" height="520" fill="url(#lr-dots)" />
      <circle cx={HUB.x} cy={HUB.y} r="190" fill="url(#lr-hub-glow)" />
      <ellipse cx="0" cy="0" rx="260" ry="200" fill="url(#lr-fog)" />
      <ellipse cx="900" cy="520" rx="260" ry="200" fill="url(#lr-fog)" />

      {territories.map((territory) => {
        const point = POSITIONS[territory.code]
        const middleX = (HUB.x + point.x) / 2
        const middleY = (HUB.y + point.y) / 2
        const controlX = middleX + (point.y - HUB.y) * 0.12
        const controlY = middleY - (point.x - HUB.x) * 0.12
        return (
          <path
            key={`route-${territory.code}`}
            className="lr-route"
            d={`M ${HUB.x} ${HUB.y} Q ${controlX.toFixed(1)} ${controlY.toFixed(1)} ${point.x} ${point.y}`}
          />
        )
      })}

      <circle className="lr-hubring" cx={HUB.x} cy={HUB.y} r="58" strokeDasharray="2 10" />
      <circle cx={HUB.x} cy={HUB.y} r="44" fill="#0E1A16" stroke="#35493F" />
      <path
        d="M450 240 L470 262 L450 284 L430 262 Z"
        fill="none"
        stroke="#EDE9DF"
        strokeWidth="2"
      />
      <path d="M438 264 L448 254 L456 261 L466 249" fill="none" stroke="#2FD08B" strokeWidth="2" />
      <circle cx="466" cy="249" r="3.5" fill="#2FD08B" />
      <text className="lr-hub-label" x={HUB.x} y="338" textAnchor="middle">
        CITADELLE
      </text>

      {territories.map((territory, index) => {
        const point = POSITIONS[territory.code]
        const link = TERRITORY_BY_CODE[territory.code]
        const isSelected = territory.code === selected
        const nodeStyle: CssVars = { '--c': territory.color }
        const label = `${territory.name}, statistique ${territory.stat_display}, ${
          STATE_LABELS[territory.state]
        }`
        return (
          <g
            key={territory.code}
            ref={(element) => {
              nodes.current[territory.code] = element
            }}
            className={isSelected ? 'lr-node is-selected' : 'lr-node'}
            style={nodeStyle}
            role="button"
            tabIndex={0}
            aria-pressed={isSelected}
            aria-label={label}
            onClick={() => onSelect(territory.code)}
            onKeyDown={(event) => handleKeyDown(event, territory, index)}
          >
            <polygon className="lr-halo" points={hexPoints(point.x, point.y, 78)} />
            <polygon className="lr-hex" points={hexPoints(point.x, point.y, 56)} />
            <g
              className="lr-gl"
              transform={`translate(${point.x - 15} ${point.y - 34}) scale(1.25)`}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              dangerouslySetInnerHTML={{ __html: link.glyph }}
            />
            <text className="lr-node-code" x={point.x} y={point.y + 14}>
              {link.statCode}
            </text>
            <text className="lr-node-state" x={point.x} y={point.y + 32}>
              {STATE_LABELS[territory.state]} · {territory.stat_display}
            </text>
            <text className="lr-node-name" x={point.x} y={point.y + (point.y < HUB.y ? -70 : 78)}>
              {territory.name.toUpperCase()}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
