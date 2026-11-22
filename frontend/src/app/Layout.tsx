import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { TopBar } from '../components/TopBar'
import { PLACEHOLDER_PROGRESS } from './placeholder'

export function Layout() {
  const [soundEnabled, setSoundEnabled] = useState(false)

  return (
    <>
      <TopBar
        level={PLACEHOLDER_PROGRESS.level}
        xp={PLACEHOLDER_PROGRESS.xp}
        xpRequired={PLACEHOLDER_PROGRESS.xpRequired}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled((enabled) => !enabled)}
      />
      <main className="lr-main">
        <Outlet />
      </main>
    </>
  )
}
