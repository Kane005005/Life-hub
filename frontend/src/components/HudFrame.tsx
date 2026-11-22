import type { HTMLAttributes, ReactNode } from 'react'

type HudFrameTag = 'div' | 'section' | 'article' | 'aside'

type HudFrameProps = HTMLAttributes<HTMLElement> & {
  as?: HudFrameTag
  children?: ReactNode
}

export function HudFrame({ as: Tag = 'div', className, children, ...props }: HudFrameProps) {
  const classes = ['lr-frame', className].filter(Boolean).join(' ')

  return (
    <Tag className={classes} {...props}>
      {children}
    </Tag>
  )
}
