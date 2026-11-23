import { useEffect, useRef, useState } from 'react'
import { cancelFrame, prefersReducedMotion, requestFrame } from '../features/fx/motion'
import type { CssVars } from '../lib/css'
import { TERRITORY_BY_CODE } from '../lib/labels'
import type { TerritoryStat } from '../lib/types'
import { TERRITORIES } from '../tokens'

type RadarProps = {
  stats: TerritoryStat[]
}

const CENTER = 150
const RADIUS = 105

type Axis = {
  code: string
  name: string
  color: string
  value: number
}

function point(index: number, value: number): [number, number] {
  const angle = -Math.PI / 2 + index * (Math.PI / 3)
  const radius = (RADIUS * value) / 100
  return [CENTER + Math.cos(angle) * radius, CENTER + Math.sin(angle) * radius]
}

function polygonPoints(values: number[]): string {
  return values
    .map((value, index) =>
      point(index, value)
        .map((number) => number.toFixed(1))
        .join(','),
    )
    .join(' ')
}

export function Radar({ stats }: RadarProps) {
  const axes: Axis[] = TERRITORIES.map((token) => {
    const stat = stats.find((item) => TERRITORY_BY_CODE[item.code].statCode === token.code)
    return {
      code: token.code,
      name: token.name,
      color: token.hex,
      value: stat?.stat_display ?? 0,
    }
  })
  const values = axes.map((axis) => axis.value)
  const valuesKey = values.join(',')
  const [shown, setShown] = useState<number[]>(() => values)
  const shownRef = useRef<number[]>(shown)

  useEffect(() => {
    const target = valuesKey.split(',').map(Number)
    const apply = (next: number[]) => {
      shownRef.current = next
      setShown(next)
    }
    if (prefersReducedMotion()) {
      apply(target)
      return
    }
    const from = shownRef.current
    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      if (prefersReducedMotion()) {
        apply(target)
        return
      }
      const progress = Math.min(1, (now - start) / 700)
      const eased = 1 - Math.pow(1 - progress, 3)
      apply(from.map((value, index) => value + (target[index] - value) * eased))
      if (progress < 1) {
        frame = requestFrame(tick)
      }
    }
    frame = requestFrame(tick)
    return () => cancelFrame(frame)
  }, [valuesKey])

  const label = `Radar des statistiques. ${axes
    .map((axis) => `${axis.name} : ${axis.value}`)
    .join(', ')}.`

  return (
    <div className="lr-radar-wrap">
      <svg className="lr-radar" viewBox="0 0 300 300" role="img" aria-label={label}>
        {[25, 50, 75, 100].map((level) => (
          <polygon
            key={level}
            points={polygonPoints(axes.map(() => level))}
            fill="none"
            stroke="#24342E"
            strokeWidth="1"
          />
        ))}
        {axes.map((axis, index) => {
          const end = point(index, 100)
          const text = point(index, 122)
          return (
            <g key={axis.code}>
              <line x1={CENTER} y1={CENTER} x2={end[0]} y2={end[1]} stroke="#24342E" />
              <text x={text[0]} y={text[1] + 4} textAnchor="middle">
                {axis.code}
              </text>
            </g>
          )
        })}
        <polygon
          points={polygonPoints(shown)}
          fill="rgba(47,208,139,.2)"
          stroke="#2FD08B"
          strokeWidth="2"
          strokeLinejoin="round"
          style={{ filter: 'drop-shadow(0 0 8px rgba(47,208,139,.5))' }}
        />
        {axes.map((axis, index) => {
          const position = point(index, shown[index] ?? 0)
          return (
            <circle
              key={axis.code}
              cx={position[0]}
              cy={position[1]}
              r="4.5"
              fill={axis.color}
              stroke="#0B100E"
              strokeWidth="1.5"
            />
          )
        })}
      </svg>
      <div className="lr-legend">
        {axes.map((axis) => {
          const style: CssVars = { '--c': axis.color }
          return (
            <div key={axis.code} style={style}>
              <i aria-hidden="true" />
              <span>{axis.name}</span>
              <span className="lr-legend-value">
                {axis.code} · {axis.value}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
