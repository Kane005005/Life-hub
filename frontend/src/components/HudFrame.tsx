import { createElement } from 'react'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'

type HudFrameTag = 'div' | 'section' | 'article' | 'aside' | 'form'

type HudFrameProps<T extends HudFrameTag = 'div'> = {
  as?: T
  children?: ReactNode
} & ComponentPropsWithoutRef<T>

export function HudFrame<T extends HudFrameTag = 'div'>({
  as,
  className,
  children,
  ...props
}: HudFrameProps<T>) {
  const classes = ['lr-frame', className].filter(Boolean).join(' ')
  const tag: HudFrameTag = as ?? 'div'

  return createElement(tag, { ...props, className: classes }, children)
}
