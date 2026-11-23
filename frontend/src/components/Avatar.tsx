import { useId } from 'react'
import type { CharacterEquipment, Silhouette } from '../lib/types'

type AvatarProps = {
  silhouette?: Silhouette
  color?: string
  accent?: string
  size?: number
  label?: string
  equipment?: CharacterEquipment | null
}

const BUSTS: Record<Silhouette, string> = {
  A: 'M40 150 C40 116 64 104 84 104 C104 104 128 116 128 150 Z',
  B: 'M26 150 C26 112 58 100 84 100 C110 100 142 112 142 150 Z',
  C: 'M42 150 C42 116 62 104 84 104 C106 104 126 116 126 150 Z',
}

export function Avatar({
  silhouette = 'A',
  color = '#2FD08B',
  accent = '#EDE9DF',
  size = 168,
  label,
  equipment,
}: AvatarProps) {
  const gradientId = `lr-avatar-${useId().replace(/:/g, '')}`
  const auraColor = equipment?.AURA?.visual?.color
  const frameStyle = equipment?.FRAME?.visual?.style
  const emblemSign = equipment?.EMBLEM?.visual?.sign ?? '◆'

  return (
    <svg
      width={size}
      height={size * (188 / 168)}
      viewBox="0 0 168 188"
      fill="none"
      role="img"
      aria-label={label ?? `Avatar ${silhouette}`}
    >
      <defs>
        <radialGradient id={gradientId} cx="50%" cy="38%" r="60%">
          <stop offset="0" stopColor={color} stopOpacity="0.55" />
          <stop offset="1" stopColor="#0B100E" stopOpacity="0" />
        </radialGradient>
      </defs>
      {auraColor ? (
        <circle
          data-avatar-aura="true"
          cx="84"
          cy="94"
          r="76"
          fill={auraColor}
          fillOpacity="0.12"
          stroke={auraColor}
          strokeOpacity="0.45"
          strokeWidth="2"
        />
      ) : null}
      <polygon
        points="84,4 160,48 160,140 84,184 8,140 8,48"
        fill={`url(#${gradientId})`}
        stroke={frameStyle === 'silver' ? '#B9BEC2' : '#35493F'}
        strokeWidth={frameStyle === 'silver' ? '2.5' : '1.5'}
      />
      {frameStyle === 'double' ? (
        <polygon
          data-avatar-frame="double"
          points="84,-2 166,45 166,143 84,190 2,143 2,45"
          fill="none"
          stroke="#B9BEC2"
          strokeOpacity="0.7"
          strokeWidth="1.5"
        />
      ) : null}
      <polygon
        points="84,14 150,52 150,136 84,174 18,136 18,52"
        fill="none"
        stroke={frameStyle === 'silver' ? '#EDE9DF' : color}
        strokeOpacity={frameStyle === 'silver' ? '0.55' : '0.45'}
        strokeWidth="1"
      />
      <circle cx="84" cy="74" r="22" fill="#0B100E" stroke={accent} strokeWidth="2" />
      <path d={BUSTS[silhouette]} fill="#0B100E" stroke={accent} strokeWidth="2" />
      {silhouette === 'C' ? (
        <path d="M66 106 L84 132 L102 106" stroke={accent} strokeWidth="2" fill="none" />
      ) : null}
      {equipment?.EMBLEM ? (
        <text
          data-avatar-emblem="true"
          x="84"
          y="142"
          textAnchor="middle"
          fontSize="14"
          fill={equipment.EMBLEM.visual?.color ?? '#EDE9DF'}
        >
          {emblemSign}
        </text>
      ) : null}
      <circle cx="84" cy="74" r="4" fill={color} />
    </svg>
  )
}
