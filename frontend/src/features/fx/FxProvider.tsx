import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { EmberCanvas } from './EmberCanvas'
import { FxContext } from './FxContext'
import type { FxApi } from './FxContext'
import { LevelUpOverlay } from './LevelUpOverlay'
import { prefersReducedMotion } from './motion'
import { Toaster } from './Toaster'
import { shake } from './shake'
import { useEmbers } from './useEmbers'
import { useToast } from './useToast'

type LevelState = {
  id: number
  level: number
  message: string | null
}

function FxInner({ children }: { children: ReactNode }) {
  const { burst } = useEmbers()
  const { toast } = useToast()
  const [levelUp, setLevelUp] = useState<LevelState | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const announceTimer = useRef<number | null>(null)
  const levelTimers = useRef<number[]>([])

  const showLevelUp = useCallback(
    (level: number, message: string | null) => {
      setLevelUp((previous) => ({
        id: (previous?.id ?? 0) + 1,
        level,
        message,
      }))
      if (prefersReducedMotion()) {
        return
      }
      const x = window.innerWidth / 2
      const y = window.innerHeight / 2
      burst(x, y, 120)
      levelTimers.current.push(
        window.setTimeout(() => {
          if (prefersReducedMotion()) {
            return
          }
          burst(x, y, 80, '237,233,223')
        }, 250),
      )
    },
    [burst],
  )

  const closeLevelUp = useCallback(() => {
    setLevelUp(null)
  }, [])

  const announce = useCallback((message: string) => {
    if (announceTimer.current !== null) {
      window.clearTimeout(announceTimer.current)
    }
    setAnnouncement(message)
    announceTimer.current = window.setTimeout(() => {
      setAnnouncement('')
      announceTimer.current = null
    }, 1200)
  }, [])

  useEffect(
    () => () => {
      if (announceTimer.current !== null) {
        window.clearTimeout(announceTimer.current)
      }
      levelTimers.current.forEach((timer) => window.clearTimeout(timer))
      levelTimers.current = []
    },
    [],
  )

  const value = useMemo<FxApi>(
    () => ({ burst, shake, showLevelUp, toast, announce }),
    [burst, showLevelUp, toast, announce],
  )

  return (
    <FxContext.Provider value={value}>
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
      {levelUp ? (
        <LevelUpOverlay
          key={levelUp.id}
          level={levelUp.level}
          message={levelUp.message}
          onClose={closeLevelUp}
        />
      ) : null}
      {children}
    </FxContext.Provider>
  )
}

export function FxProvider({ children }: { children: ReactNode }) {
  return (
    <EmberCanvas>
      <Toaster>
        <FxInner>{children}</FxInner>
      </Toaster>
    </EmberCanvas>
  )
}
