import { formatDate } from '../lib/format'
import type { Achievement } from '../lib/types'

type AchievementGridProps = {
  achievements: Achievement[]
}

export function AchievementGrid({ achievements }: AchievementGridProps) {
  const items = achievements ?? []
  return (
    <div className="ach lr-ach-grid" aria-label="Succès">
      {items.map((achievement) => {
        const unlocked = achievement.unlocked
        return (
          <article
            key={achievement.code}
            className={unlocked ? 'a on' : 'a lock'}
            aria-label={`${achievement.label}, ${unlocked ? 'obtenu' : 'verrouillé'}`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polygon points="12,3 20,7.5 20,16.5 12,21 4,16.5 4,7.5" />
              {unlocked ? <path d="M8 12 L11 15 L16 9" /> : null}
            </svg>
            <b>{achievement.label}</b>
            <span>{achievement.description}</span>
            {unlocked && achievement.unlocked_at ? (
              <span className="lr-ach-date">Obtenu le {formatDate(achievement.unlocked_at)}</span>
            ) : null}
          </article>
        )
      })}
    </div>
  )
}
