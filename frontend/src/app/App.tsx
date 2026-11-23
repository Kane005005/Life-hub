import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { FxProvider } from '../features/fx/FxProvider'
import { SoundProvider } from '../features/fx/SoundProvider'
import { GameMasterPage } from '../pages/GameMasterPage'
import { HeroPage } from '../pages/HeroPage'
import { JournalPage } from '../pages/JournalPage'
import { LoginPage } from '../pages/LoginPage'
import { QuestsPage } from '../pages/QuestsPage'
import { SeasonsPage } from '../pages/SeasonsPage'
import { SettingsPage } from '../pages/SettingsPage'
import { ShopPage } from '../pages/ShopPage'
import { WorldPage } from '../pages/WorldPage'
import { Layout } from './Layout'
import { RequireAuth } from './RequireAuth'
import { RequireCharacter } from './RequireCharacter'

export default function App() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <FxProvider>
          <SoundProvider>
            <Routes>
              <Route path="/connexion" element={<LoginPage />} />
              <Route element={<RequireAuth />}>
                <Route element={<RequireCharacter />}>
                  <Route element={<Layout />}>
                    <Route path="/" element={<WorldPage />} />
                    <Route path="/heros" element={<HeroPage />} />
                    <Route path="/missions" element={<QuestsPage />} />
                    <Route path="/game-master" element={<GameMasterPage />} />
                    <Route path="/boutique" element={<ShopPage />} />
                    <Route path="/saisons" element={<SeasonsPage />} />
                    <Route path="/journal" element={<JournalPage />} />
                    <Route path="/reglages" element={<SettingsPage />} />
                  </Route>
                </Route>
              </Route>
            </Routes>
          </SoundProvider>
        </FxProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
