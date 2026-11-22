type LogoMarkProps = {
  size?: number
  title?: string
}

export function LogoMark({ size = 28, title }: LogoMarkProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <circle
        cx="32"
        cy="32"
        r="26"
        stroke="currentColor"
        strokeWidth={3.5}
        strokeDasharray="24 3.23"
        transform="rotate(-92 32 32)"
      />
      <path
        d="M19 41 L28 32 L34 37 L44 25"
        stroke="currentColor"
        strokeWidth={3.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="44" cy="25" r="4.4" style={{ fill: 'var(--node, #2FD08B)' }} />
    </svg>
  )
}
