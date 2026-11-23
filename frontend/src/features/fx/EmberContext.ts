import { createContext } from 'react'

export type EmberApi = {
  burst: (x: number, y: number, count: number, color?: string) => void
}

export const EmberContext = createContext<EmberApi>({
  burst: () => undefined,
})
