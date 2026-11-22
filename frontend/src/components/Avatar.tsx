import { useId } from 'react'
import type { Silhouette } from '../lib/types'

type AvatarProps = {
  silhouette?: Silhouette
  color?: string
  accent?: string
  size?: number
  label?: string
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
}: AvatarProps) {
  const gradientId = `lr-avatar-${useId().replace(/:/g, '')}`

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
      <polygon
        points="84,4 160,48 160,140 84,184 8,140 8,48"
        fill={`url(#${gradientId})`}
        stroke="#35493F"
        strokeWidth="1.5"
      />
      <polygon
        points="84,14 150,52 150,136 84,174 18,136 18,52"
        fill="none"
        stroke={color}
        strokeOpacity="0.45"
        strokeWidth="1"
      />
      <circle cx="84" cy="74" r="22" fill="#0B100E" stroke={accent} strokeWidth="2" />
      <path d={BUSTS[silhouette]} fill="#0B100E" stroke={accent} strokeWidth="2" />
      {silhouette === 'C' ? (
        <path d="M66 106 L84 132 L102 106" stroke={accent} strokeWidth="2" fill="none" />
      ) : null}
      <circle cx="84" cy="74" r="4" fill={color} />
    </svg>
  )
}
