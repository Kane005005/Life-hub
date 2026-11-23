import { useMemo } from 'react'
import type { TerritoryCode } from '../lib/types'

type SkillConstellationProps = {
  territory: TerritoryCode
  color: string
}

type Star = {
  x: number
  y: number
  radius: number
  opacity: number
  twinkle: boolean
  delay: number
}

type Sky = {
  stars: Star[]
  lines: { x1: number; y1: number; x2: number; y2: number }[]
}

const WIDTH = 720
const HEIGHT = 630
const STAR_COUNT = 38
const TWINKLE_COUNT = 6

function seededRandom(seed: number): () => number {
  let state = seed
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 4294967296
  }
}

function seedFromTerritory(territory: TerritoryCode): number {
  let hash = 2166136261
  for (let index = 0; index < territory.length; index += 1) {
    hash ^= territory.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function buildSky(territory: TerritoryCode): Sky {
  const random = seededRandom(seedFromTerritory(territory))
  const stars: Star[] = Array.from({ length: STAR_COUNT }, (_, index) => ({
    x: 12 + random() * (WIDTH - 24),
    y: 16 + random() * (HEIGHT - 32),
    radius: 0.6 + random() * 1.1,
    opacity: 0.18 + random() * 0.34,
    twinkle: index < TWINKLE_COUNT,
    delay: random() * 6,
  }))

  const lines = [
    [1, 5, 9, 14],
    [14, 9, 21, 26],
    [26, 21, 30, 35],
    [3, 11, 18, 24],
    [24, 18, 33, 37],
  ].map(([from, via, to, end]) => ({
    x1: stars[from].x,
    y1: stars[from].y,
    x2: stars[via].x,
    y2: stars[via].y,
    nextX: stars[to].x,
    nextY: stars[to].y,
    endX: stars[end].x,
    endY: stars[end].y,
  }))

  const segments = lines.flatMap((line) => [
    { x1: line.x1, y1: line.y1, x2: line.x2, y2: line.y2 },
    { x1: line.x2, y1: line.y2, x2: line.nextX, y2: line.nextY },
    { x1: line.nextX, y1: line.nextY, x2: line.endX, y2: line.endY },
  ])

  return { stars, lines: segments }
}

export function SkillConstellation({ territory, color }: SkillConstellationProps) {
  const sky = useMemo(() => buildSky(territory), [territory])
  const gradientId = `lr-skill-sky-${territory.toLowerCase()}`

  return (
    <svg
      className="lr-skill-constellation"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id={gradientId} cx="50%" cy="42%" r="68%">
          <stop offset="0" stopColor={color} stopOpacity="0.13" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={WIDTH} height={HEIGHT} fill="#0a120f" />
      <rect width={WIDTH} height={HEIGHT} fill={`url(#${gradientId})`} />
      <g className="lr-skill-constellation-lines">
        {sky.lines.map((line, index) => (
          <line
            key={index}
            className="lr-skill-constellation-line"
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
          />
        ))}
      </g>
      <g>
        {sky.stars.map((star, index) => (
          <circle
            key={index}
            className={star.twinkle ? 'lr-skill-star lr-skill-star--twinkle' : 'lr-skill-star'}
            cx={star.x}
            cy={star.y}
            r={star.radius}
            opacity={star.opacity}
            style={star.twinkle ? { animationDelay: `${star.delay}s` } : undefined}
          />
        ))}
      </g>
    </svg>
  )
}
