import { useFx } from '../features/fx/useFx'
import { playSfx } from '../features/fx/sound'
import { ApiError } from '../lib/api'
import { useRest } from '../lib/queries'
import { Button } from './Button'

export function RestButton() {
  const rest = useRest()
  const { announce, toast } = useFx()

  async function handleRest() {
    try {
      const data = await rest.mutateAsync()
      announce(data.message)
      toast(data.message)
      playSfx('rest')
    } catch (cause) {
      const detail = cause instanceof ApiError ? cause.detail : 'Repos impossible.'
      announce(detail)
      toast(detail)
    }
  }

  return (
    <Button variant="quiet" onClick={() => void handleRest()} disabled={rest.isPending}>
      Se reposer aujourd'hui
    </Button>
  )
}
