import { useContext } from 'react'
import { FxContext } from './FxContext'
import type { FxApi } from './FxContext'

export function useFx(): FxApi {
  return useContext(FxContext)
}
