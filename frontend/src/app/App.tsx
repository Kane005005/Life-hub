import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { FxProvider } from '../features/fx/FxProvider'
import { HeroPage } from '../pages/HeroPage'
import { JournalPage } from '../pages/JournalPage'
import { LoginPage } from '../pages/LoginPage'
import { PlaceholderPage } from '../pages/PlaceholderPage'
import { QuestsPage } from '../pages/QuestsPage'
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
          <Routes>
            <Route path="/connexion" element={<LoginPage />} />
            <Route element={<RequireAuth />}>
              <Route element={<RequireCharacter />}>
                <Route element={<Layout />}>
                  <Route path="/" element={<WorldPage />} />
                  <Route path="/heros" element={<HeroPage />} />
                  <Route path="/missions" element={<QuestsPage />} />
                  <Route path="/game-master" element={<PlaceholderPage title="Game Master" />} />
                  <Route path="/boutique" element={<PlaceholderPage title="Boutique" />} />
                  <Route path="/saisons" element={<PlaceholderPage title="Saisons" />} />
                  <Route path="/journal" element={<JournalPage />} />
                  <Route path="/reglages" element={<PlaceholderPage title="Réglages" />} />
                </Route>
              </Route>
            </Route>
          </Routes>
        </FxProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
