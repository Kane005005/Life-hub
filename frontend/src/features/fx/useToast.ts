import { useContext } from 'react'
import { ToastContext } from './ToastContext'
import type { ToastApi } from './ToastContext'

export function useToast(): ToastApi {
  return useContext(ToastContext)
}
