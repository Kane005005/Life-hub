import { useEffect, useRef } from 'react'
import { Button } from '../../components/Button'
import { prefersReducedMotion } from './motion'

type LevelUpOverlayProps = {
  level: number
  message: string | null
  onClose: () => void
  open?: boolean
}

export function LevelUpOverlay({ level, message, onClose, open = true }: LevelUpOverlayProps) {
  const container = useRef<HTMLDivElement>(null)
  const animated = !prefersReducedMotion()

  useEffect(() => {
    if (!open) {
      return
    }
    container.current?.querySelector('button')?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    const timer = window.setTimeout(onClose, 5000)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.clearTimeout(timer)
    }
  }, [onClose, open])

  if (!open) {
    return null
  }

  const classes = ['lr-lvlup', 'lr-lvlup--open', animated ? 'lr-lvlup--animated' : undefined]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      ref={container}
      className={classes}
      role="dialog"
      aria-modal="true"
      aria-label="Niveau atteint"
    >
      {animated ? (
        <>
          <div className="rays" aria-hidden="true" />
          <div className="ring" aria-hidden="true" />
        </>
      ) : null}
      <small>Niveau atteint</small>
      <div className="lr-lvlup-number">{level}</div>
      <p>{message ?? ''}</p>
      <Button variant="solid" onClick={onClose} autoFocus>
        Continuer
      </Button>
    </div>
  )
}
