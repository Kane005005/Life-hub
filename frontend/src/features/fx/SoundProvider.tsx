import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { SoundContext } from './SoundContext'
import { setSoundEnabled } from './sound'

const SOUND_KEY = 'lr-sound'

function readSound(): boolean {
  try {
    return window.localStorage.getItem(SOUND_KEY) === 'true'
  } catch {
    return false
  }
}

function writeSound(value: boolean): void {
  try {
    window.localStorage.setItem(SOUND_KEY, value ? 'true' : 'false')
  } catch {
    // Le son reste utilisable sans stockage persistant.
  }
}

export function SoundProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(readSound)

  useEffect(() => {
    setSoundEnabled(enabled)
  }, [enabled])

  const toggle = useCallback(() => {
    const next = !enabled
    setEnabled(next)
    writeSound(next)
  }, [enabled])

  const value = useMemo(() => ({ enabled, toggle }), [enabled, toggle])

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>
}
