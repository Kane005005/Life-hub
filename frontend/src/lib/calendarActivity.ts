/** Niveaux d'intensité des jours actifs : classes complètes, sans calcul de règle de jeu. */

const ACTIVITY_CLASS_BY_LEVEL = {
  low: 'lr-cal-day--active-low',
  medium: 'lr-cal-day--active-medium',
  high: 'lr-cal-day--active-high',
} as const

export function activityClass(completions: number): string {
  if (completions === 1) {
    return ACTIVITY_CLASS_BY_LEVEL.low
  }
  if (completions <= 3) {
    return ACTIVITY_CLASS_BY_LEVEL.medium
  }
  return ACTIVITY_CLASS_BY_LEVEL.high
}
