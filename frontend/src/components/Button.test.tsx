import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button'

describe('Button', () => {
  it('utilise type="button" par défaut', () => {
    render(<Button>Valider</Button>)

    expect(screen.getByRole('button', { name: 'Valider' })).toHaveAttribute('type', 'button')
  })

  it('applique les classes de variante', () => {
    const { rerender } = render(<Button variant="solid">Solid</Button>)

    expect(screen.getByRole('button', { name: 'Solid' })).toHaveClass('lr-btn', 'lr-btn--solid')

    rerender(<Button variant="quiet">Quiet</Button>)

    const quiet = screen.getByRole('button', { name: 'Quiet' })
    expect(quiet).toHaveClass('lr-btn', 'lr-btn--quiet')
    expect(quiet).not.toHaveClass('lr-btn--solid')
  })

  it('bloque le clic quand il est désactivé', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <Button disabled onClick={onClick}>
        Entrer
      </Button>,
    )

    await user.click(screen.getByRole('button', { name: 'Entrer' }))

    expect(onClick).not.toHaveBeenCalled()
  })
})
