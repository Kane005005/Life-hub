import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Avatar } from './Avatar'

describe('Avatar', () => {
  it('dessine une aura avec la couleur reçue', () => {
    const { container } = render(
      <Avatar
        equipment={{
          AURA: {
            id: 1,
            name: "Aura d'émeraude",
            description: '',
            category: 'ARTIFACT',
            slot: 'AURA',
            cost: 100,
            is_available: true,
            is_custom: false,
            visual: { color: '#2FD08B' },
            owned: true,
            equipped: true,
            purchases_count: 1,
          },
          FRAME: null,
          EMBLEM: null,
        }}
      />,
    )

    const aura = container.querySelector('[data-avatar-aura="true"]')
    expect(aura).toBeInTheDocument()
    expect(aura).toHaveAttribute('stroke', '#2FD08B')
  })
})
