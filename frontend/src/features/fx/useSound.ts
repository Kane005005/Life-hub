import { useContext } from 'react'
import { SoundContext } from './SoundContext'
import type { SoundState } from './SoundContext'

export function useSound(): SoundState {
  const context = useContext(SoundContext)
  if (!context) {
    throw new Error('Le réglage du son doit être utilisé dans SoundProvider.')
  }
  return context
}
