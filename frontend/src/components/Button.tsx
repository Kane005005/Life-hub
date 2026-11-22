import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'default' | 'solid' | 'quiet'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  children?: ReactNode
}

export function Button({
  variant = 'default',
  type = 'button',
  className,
  children,
  ...props
}: ButtonProps) {
  const variantClass =
    variant === 'default' ? undefined : variant === 'solid' ? 'lr-btn--solid' : 'lr-btn--quiet'
  const classes = ['lr-btn', variantClass, className].filter(Boolean).join(' ')

  return (
    <button type={type} className={classes} {...props}>
      {children}
    </button>
  )
}
