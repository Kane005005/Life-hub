import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { makeAchievement } from '../test/fixtures'
import { AchievementGrid } from './AchievementGrid'

describe('AchievementGrid', () => {
  it('affiche les succès obtenus et verrouillés', () => {
    render(
      <AchievementGrid
        achievements={[
          makeAchievement({
            code: 'FIRST_QUEST',
            label: 'Premier pas',
            unlocked: true,
            unlocked_at: '2026-11-20T10:00:00Z',
          }),
          makeAchievement({
            code: 'CREATOR',
            label: 'Créateur',
            description: 'Valider une mission en Création.',
            unlocked: false,
            unlocked_at: null,
          }),
        ]}
      />,
    )

    expect(screen.getByLabelText('Premier pas, obtenu')).toHaveClass('on')
    expect(screen.getByLabelText('Créateur, verrouillé')).toHaveClass('lock')
    expect(screen.getByText(/Obtenu le/)).toBeInTheDocument()
  })
})
