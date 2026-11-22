import { useCallback } from 'react'
import type { CompletionResult } from '../../lib/types'
import { useFx } from './useFx'
import { playSfx } from './sound'

export type Celebrate = (result: CompletionResult, element: Element | null) => void

export function useCelebrate(): Celebrate {
  const { burst, shake: shakeBody, showLevelUp, toast, announce } = useFx()

  return useCallback(
    (result: CompletionResult, element: Element | null) => {
      const isBoss = result.quest.quest_type === 'BOSS'
      let x = window.innerWidth / 2
      let y = window.innerHeight / 2
      if (element && typeof element.getBoundingClientRect === 'function') {
        const rect = element.getBoundingClientRect()
        x = rect.left + rect.width / 2
        y = rect.top + rect.height / 2
      }

      burst(x, y, isBoss ? 90 : 34)
      if (isBoss) {
        shakeBody()
        playSfx('boss')
      } else {
        playSfx('ok')
      }

      announce(result.result.message)
      toast(result.result.message)

      if (result.result.levels_gained > 0) {
        window.setTimeout(
          () => {
            showLevelUp(result.result.level_after, result.result.level_message)
            playSfx('lvl')
          },
          isBoss ? 600 : 300,
        )
      }
    },
    [announce, burst, shakeBody, showLevelUp, toast],
  )
}
