import { createContext } from 'react'

export type ToastApi = {
  toast: (message: string) => void
}

export const ToastContext = createContext<ToastApi>({
  toast: () => undefined,
})
