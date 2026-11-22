import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { PlaceholderPage } from '../pages/PlaceholderPage'
import { WorldPage } from '../pages/WorldPage'
import { Layout } from './Layout'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<WorldPage />} />
            <Route path="/heros" element={<PlaceholderPage title="Héros" />} />
            <Route path="/missions" element={<PlaceholderPage title="Missions" />} />
            <Route path="/game-master" element={<PlaceholderPage title="Game Master" />} />
            <Route path="/boutique" element={<PlaceholderPage title="Boutique" />} />
            <Route path="/saisons" element={<PlaceholderPage title="Saisons" />} />
            <Route path="/journal" element={<PlaceholderPage title="Journal" />} />
            <Route path="/reglages" element={<PlaceholderPage title="Réglages" />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
