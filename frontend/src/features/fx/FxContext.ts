import { createContext } from 'react'

export type FxApi = {
  burst: (x: number, y: number, count: number, color?: string) => void
  shake: () => void
  showLevelUp: (level: number, message: string | null) => void
  toast: (message: string) => void
  announce: (message: string) => void
}

export const FxContext = createContext<FxApi>({
  burst: () => undefined,
  shake: () => undefined,
  showLevelUp: () => undefined,
  toast: () => undefined,
  announce: () => undefined,
})
