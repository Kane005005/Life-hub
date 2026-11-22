import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TERRITORY_LABELS } from '../src/lib/labels'
import type { TerritoryCode } from '../src/lib/types'
import { makeTerritory } from '../src/test/fixtures'
import { WorldMap } from '../src/components/WorldMap'

const codes = Object.keys(TERRITORY_LABELS) as TerritoryCode[]
const territories = codes.map((code) =>
  makeTerritory({ code, name: TERRITORY_LABELS[code], stat_display: 42, active_quests: 1 }),
)

describe('WorldMap (copie temporaire)', () => {
  it('reste verte si le fichier est découvert par vitest', () => {
    const onSelect = vi.fn()
    render(<WorldMap territories={territories} selected="BODY" onSelect={onSelect} />)
    fireEvent.keyDown(screen.getAllByRole('button')[0], { key: 'Enter' })
    expect(screen.getAllByRole('button')).toHaveLength(6)
  })
})
