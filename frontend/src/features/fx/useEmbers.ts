import { useContext } from 'react'
import { EmberContext } from './EmberContext'
import type { EmberApi } from './EmberContext'

export function useEmbers(): EmberApi {
  return useContext(EmberContext)
}
