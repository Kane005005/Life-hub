import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { WorldPage } from './WorldPage'

describe('WorldPage', () => {
  it('affiche son titre en attendant la phase 2', () => {
    render(<WorldPage />)
    expect(screen.getByRole('heading', { name: 'Monde', level: 1 })).toBeInTheDocument()
  })
})
