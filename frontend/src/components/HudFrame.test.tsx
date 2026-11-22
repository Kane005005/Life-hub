import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HudFrame } from './HudFrame'

describe('HudFrame', () => {
  it('rend ses enfants', () => {
    render(<HudFrame>Contenu du cadre</HudFrame>)

    expect(screen.getByText('Contenu du cadre')).toBeInTheDocument()
  })

  it('utilise la balise demandée', () => {
    const { rerender } = render(<HudFrame>Contenu</HudFrame>)

    expect(screen.getByText('Contenu').tagName).toBe('DIV')

    rerender(<HudFrame as="section">Contenu</HudFrame>)

    expect(screen.getByText('Contenu').tagName).toBe('SECTION')
  })
})
