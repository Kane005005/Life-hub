import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TERRITORY_LABELS } from '../lib/labels'
import type { TerritoryCode, TerritoryStat } from '../lib/types'
import { makeTerritory } from '../test/fixtures'
import { Radar } from './Radar'

const values: Record<TerritoryCode, number> = {
  KNOWLEDGE: 42,
  BODY: 55,
  CAREER: 68,
  TECHNOLOGY: 71,
  CREATION: 84,
  INNER_WORLD: 96,
}

const stats: TerritoryStat[] = (Object.keys(TERRITORY_LABELS) as TerritoryCode[]).map((code) =>
  makeTerritory({ code, name: TERRITORY_LABELS[code], stat_display: values[code] }),
)

describe('Radar', () => {
  it('décrit les six valeurs dans son libellé', () => {
    render(<Radar stats={stats} />)

    const label = screen.getByRole('img').getAttribute('aria-label') ?? ''
    Object.values(values).forEach((value) => {
      expect(label).toContain(`${value}`)
    })
    expect(label).toContain('Savoir : 42')
    expect(label).toContain('Monde intérieur : 96')
  })
})
