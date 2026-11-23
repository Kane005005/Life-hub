import { Link, NavLink } from 'react-router-dom'
import { LogoMark } from './LogoMark'
import { SoundToggle } from './SoundToggle'
import { XpGauge } from './XpGauge'

type TopBarProps = {
  level: number
  xp: number
  xpRequired: number
  soundEnabled: boolean
  onToggleSound: () => void
  pulse?: boolean
  onLogout?: () => void
  pendingProposals?: number
}

const NAV_ITEMS = [
  { to: '/', label: 'Monde' },
  { to: '/heros', label: 'Héros' },
  { to: '/missions', label: 'Missions' },
  { to: '/game-master', label: 'Game Master' },
  { to: '/boutique', label: 'Boutique' },
  { to: '/saisons', label: 'Saisons' },
  { to: '/journal', label: 'Journal' },
  { to: '/reglages', label: 'Réglages' },
] as const

export function TopBar({
  level,
  xp,
  xpRequired,
  soundEnabled,
  onToggleSound,
  pulse = false,
  onLogout,
  pendingProposals = 0,
}: TopBarProps) {
  return (
    <header className="lr-topbar">
      <Link className="lr-brand" to="/" aria-label="LIFE RPG, accueil">
        <LogoMark />
        <span>LIFE RPG</span>
      </Link>

      <nav className="lr-nav" aria-label="Navigation principale">
        {NAV_ITEMS.map((item) => {
          const isGameMaster = item.to === '/game-master'
          const pending = isGameMaster ? pendingProposals : 0
          const label =
            pending > 0
              ? `Game Master, ${pending} proposition${pending > 1 ? 's' : ''} en attente`
              : undefined
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end
              aria-label={label}
              className={({ isActive }) => (isActive ? 'on' : undefined)}
            >
              {pending > 0 ? (
                <>
                  {item.label}
                  <span className="lr-nav-count" aria-hidden="true">
                    {pending}
                  </span>
                </>
              ) : (
                item.label
              )}
            </NavLink>
          )
        })}
      </nav>

      <div className="lr-mini">
        <span className="lr-lvl">NIV {level}</span>
        <XpGauge variant="mini" level={level} xp={xp} xpRequired={xpRequired} pulse={pulse} />
        <SoundToggle enabled={soundEnabled} onToggle={onToggleSound} />
        {onLogout ? (
          <button type="button" className="lr-snd" onClick={onLogout}>
            Quitter
          </button>
        ) : null}
      </div>
    </header>
  )
}
