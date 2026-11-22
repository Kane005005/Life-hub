import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TERRITORY_LABELS } from '../lib/labels'
import type { TerritoryCode } from '../lib/types'
import { makeTerritory } from '../test/fixtures'
import { WorldMap } from './WorldMap'

const codes = Object.keys(TERRITORY_LABELS) as TerritoryCode[]
const territories = codes.map((code) =>
  makeTerritory({ code, name: TERRITORY_LABELS[code], stat_display: 42, active_quests: 1 }),
)

function renderMap(onSelect = vi.fn()) {
  render(<WorldMap territories={territories} selected="BODY" onSelect={onSelect} />)
  return onSelect
}

function nodes(): HTMLElement[] {
  return screen.getAllByRole('button')
}

describe('WorldMap', () => {
  it('affiche six nœuds avec leurs libellés', () => {
    renderMap()

    expect(nodes()).toHaveLength(6)
    expect(nodes()[0]).toHaveAttribute('aria-label', 'Savoir, statistique 42, Développement')
    expect(nodes()[5]).toHaveAttribute(
      'aria-label',
      'Monde intérieur, statistique 42, Développement',
    )
  })

  it('sélectionne le nœud avec Entrée', () => {
    const onSelect = renderMap()

    fireEvent.keyDown(nodes()[2], { key: 'Enter' })

    expect(onSelect).toHaveBeenCalledWith('CAREER')
  })

  it('déplace le focus avec la flèche droite', () => {
    renderMap()

    nodes()[0].focus()
    fireEvent.keyDown(nodes()[0], { key: 'ArrowRight' })

    expect(nodes()[1]).toHaveFocus()
  })
})
