import { useEffect, useRef } from 'react'
import { Button } from '../../components/Button'

type LevelUpOverlayProps = {
  level: number
  message: string | null
  onClose: () => void
  open?: boolean
}

export function LevelUpOverlay({ level, message, onClose, open = true }: LevelUpOverlayProps) {
  const container = useRef<HTMLDivElement>(null)

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

  return (
    <div
      ref={container}
      className="lr-lvlup show"
      role="dialog"
      aria-modal="true"
      aria-label="Niveau atteint"
    >
      <div className="rays" aria-hidden="true" />
      <div className="ring" aria-hidden="true" />
      <small>Niveau atteint</small>
      <div className="big">{level}</div>
      <p>{message ?? ''}</p>
      <Button variant="solid" onClick={onClose} autoFocus>
        Continuer
      </Button>
    </div>
  )
}
