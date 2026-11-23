import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ToastContext } from './ToastContext'

type ToasterProps = {
  children?: ReactNode
}

export function Toaster({ children }: ToasterProps) {
  const [message, setMessage] = useState('')
  const [visible, setVisible] = useState(false)
  const timer = useRef<number | null>(null)

  const toast = useCallback((nextMessage: string) => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current)
    }
    setMessage(nextMessage)
    setVisible(true)
    timer.current = window.setTimeout(() => {
      setVisible(false)
      setMessage('')
      timer.current = null
    }, 2400)
  }, [])

  useEffect(
    () => () => {
      if (timer.current !== null) {
        window.clearTimeout(timer.current)
      }
    },
    [],
  )

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      <div
        className={visible ? 'lr-toast show' : 'lr-toast'}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {message}
      </div>
      {children}
    </ToastContext.Provider>
  )
}
