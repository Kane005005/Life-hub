import { createContext } from 'react'

export type SoundState = {
  enabled: boolean
  toggle: () => void
}

export const SoundContext = createContext<SoundState | null>(null)
