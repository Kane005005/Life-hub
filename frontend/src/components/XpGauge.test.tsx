import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { XpGauge } from './XpGauge'

describe('XpGauge', () => {
  it('expose les valeurs aria', () => {
    render(<XpGauge level={7} xp={214} xpRequired={400} />)

    const gauge = screen.getByRole('progressbar')
    expect(gauge).toHaveAttribute('aria-valuemin', '0')
    expect(gauge).toHaveAttribute('aria-valuemax', '400')
    expect(gauge).toHaveAttribute('aria-valuenow', '214')
    expect(gauge).toHaveAttribute('aria-label', 'Niveau 7, 214 sur 400 XP')
  })

  it('affiche 53,5 % pour 214 XP sur 400', () => {
    const { container } = render(<XpGauge level={7} xp={214} xpRequired={400} />)

    expect(container.querySelector('.lr-fill')).toHaveStyle({ width: '53.5%' })
  })

  it('plafonne la largeur à 100 %', () => {
    const { container } = render(<XpGauge level={7} xp={500} xpRequired={400} />)

    expect(container.querySelector('.lr-fill')).toHaveStyle({ width: '100%' })
  })

  it('affiche 0 % quand le palier vaut zéro', () => {
    const { container } = render(<XpGauge level={1} xp={214} xpRequired={0} />)

    expect(container.querySelector('.lr-fill')).toHaveStyle({ width: '0%' })
  })

  it('cache le texte de niveau en variante mini', () => {
    render(<XpGauge level={7} xp={214} xpRequired={400} variant="mini" />)

    expect(screen.queryByText(/Niveau/)).not.toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })
})
