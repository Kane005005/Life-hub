import { CharacterForm } from '../components/CharacterForm'
import { useCharacter } from '../lib/queries'
import type { Character } from '../lib/types'

type OnboardingPageProps = {
  character?: Character
}

export function OnboardingPage({ character }: OnboardingPageProps) {
  const { data } = useCharacter()
  const source = character ?? data

  return (
    <main className="lr-onboard">
      <p className="lr-eyebrow">Première étape</p>
      <h1 className="lr-title">Crée ton personnage</h1>
      <p className="lr-lede">Choisis ta silhouette. Le reste viendra avec le temps.</p>
      {source ? (
        <CharacterForm character={source} submitLabel="Créer mon personnage" onboarding />
      ) : (
        <p className="lr-note">Chargement du personnage…</p>
      )}
    </main>
  )
}
