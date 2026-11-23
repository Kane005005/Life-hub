import { Navigate, Outlet } from 'react-router-dom'
import { useCharacter } from '../lib/queries'
import { OnboardingPage } from '../pages/OnboardingPage'

export function RequireCharacter() {
  const { data, isPending, isError } = useCharacter()

  if (isPending) {
    return <p className="lr-note">Chargement du personnage…</p>
  }

  if (isError || !data) {
    return <Navigate to="/connexion" replace />
  }

  if (!data.is_onboarded) {
    return <OnboardingPage character={data} />
  }

  return <Outlet />
}
