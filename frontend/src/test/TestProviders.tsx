import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { FxContext } from '../features/fx/FxContext'
import type { FxApi } from '../features/fx/FxContext'

type TestProvidersProps = {
  children: ReactNode
  fx?: Partial<FxApi>
  initialEntries?: string[]
}

const noopFx: FxApi = {
  burst: () => undefined,
  shake: () => undefined,
  showLevelUp: () => undefined,
  toast: () => undefined,
  announce: () => undefined,
}

function LocationProbe() {
  const location = useLocation()
  return (
    <span data-testid="location-search" hidden>
      {location.search}
    </span>
  )
}

export function TestProviders({ children, fx, initialEntries }: TestProvidersProps) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
      }),
  )

  return (
    <QueryClientProvider client={client}>
      <FxContext.Provider value={{ ...noopFx, ...fx }}>
        <MemoryRouter initialEntries={initialEntries}>
          <LocationProbe />
          {children}
        </MemoryRouter>
      </FxContext.Provider>
    </QueryClientProvider>
  )
}
