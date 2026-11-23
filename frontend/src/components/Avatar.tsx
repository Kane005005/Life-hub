import { useId } from 'react'
import '../styles/shop.css'
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
  const gradientId = `lr-avatar-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`
  const auraColor = equipment?.AURA?.visual?.color
  const frameStyle = equipment?.FRAME?.visual?.style
  const emblem = equipment?.EMBLEM
  const emblemColor = emblem?.visual?.color ?? '#EDE9DF'
  const emblemSign = emblem?.visual?.sign
  const outerStroke = frameStyle === 'silver' ? '#B9BEC2' : '#35493F'
  const innerStroke = frameStyle === 'silver' ? '#EDE9DF' : color
  const outerWidth = frameStyle === 'silver' ? '2.5' : '1.5'
  const innerOpacity = frameStyle === 'silver' ? '0.55' : '0.45'

  return (
    <svg
      className="lr-avatar"
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
        <radialGradient id={`${gradientId}-aura`} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor={auraColor ?? color} stopOpacity="0.42" />
          <stop offset="1" stopColor={auraColor ?? color} stopOpacity="0" />
        </radialGradient>
      </defs>
      {auraColor ? (
        <g aria-hidden="true">
          <circle cx="84" cy="94" r="76" fill={`url(#${gradientId}-aura)`} />
          <circle
            data-avatar-aura="true"
            className="lr-avatar-aura"
            cx="84"
            cy="94"
            r="76"
            fill="none"
            stroke={auraColor}
            strokeOpacity="0.45"
            strokeWidth="2"
          />
        </g>
      ) : null}
      <polygon
        points="84,4 160,48 160,140 84,184 8,140 8,48"
        fill={`url(#${gradientId})`}
        stroke={outerStroke}
        strokeWidth={outerWidth}
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
        stroke={innerStroke}
        strokeOpacity={innerOpacity}
        strokeWidth="1"
      />
      <circle cx="84" cy="74" r="22" fill="#0B100E" stroke={accent} strokeWidth="2" />
      <path
        d={BUSTS[silhouette]}
        fill="#0B100E"
        stroke={accent}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {silhouette === 'C' ? (
        <path d="M66 106 L84 132 L102 106" stroke={accent} strokeWidth="2" fill="none" />
      ) : null}
      {emblem ? (
        <g data-avatar-emblem="true" className="lr-avatar-emblem">
          <path
            d="M68 143 L78 133 L85 139 L99 124"
            fill="none"
            stroke={emblemColor}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="99" cy="124" r="3" fill={emblemColor} />
          {emblemSign && emblemSign !== '◆' ? (
            <text
              className="lr-avatar-emblem-sign"
              x="84"
              y="160"
              textAnchor="middle"
              fontSize="10"
              fill={emblemColor}
            >
              {emblemSign}
            </text>
          ) : null}
        </g>
      ) : null}
      <circle className="lr-avatar-core" cx="84" cy="74" r="4" fill={color} />
    </svg>
  )
}
