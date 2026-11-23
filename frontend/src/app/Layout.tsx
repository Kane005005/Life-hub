import { useEffect, useRef, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { TopBar } from '../components/TopBar'
import { useSound } from '../features/fx/useSound'
import { useCharacter, useLogout, useProposals } from '../lib/queries'

export function Layout() {
  const navigate = useNavigate()
  const { data: character } = useCharacter()
  const logout = useLogout()
  const { enabled: soundEnabled, toggle: toggleSound } = useSound()
  const proposals = useProposals('PENDING')
  const [pulse, setPulse] = useState(false)
  const previousXp = useRef<number | null>(null)

  const xp = character?.xp_in_level ?? 0

  useEffect(() => {
    if (previousXp.current !== null && previousXp.current !== xp) {
      setPulse(true)
      const timer = window.setTimeout(() => setPulse(false), 900)
      previousXp.current = xp
      return () => window.clearTimeout(timer)
    }
    previousXp.current = xp
  }, [xp])

  async function handleLogout() {
    try {
      await logout.mutateAsync()
    } catch {
      // La déconnexion locale suffit, même si le serveur ne répond pas.
    } finally {
      navigate('/connexion', { replace: true })
    }
  }

  return (
    <>
      <TopBar
        level={character?.level ?? 0}
        xp={xp}
        xpRequired={character?.xp_required ?? 0}
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
        pulse={pulse}
        onLogout={handleLogout}
        pendingProposals={proposals.data?.count ?? 0}
      />
      <main className="lr-main">
        <Outlet />
      </main>
    </>
  )
}
