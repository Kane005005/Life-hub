import { useQuery } from '@tanstack/react-query'

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { Accept: 'application/json' },
  })

  if (!res.ok) {
    throw new Error(`Impossible de joindre l'API locale (${res.status}).`)
  }

  return res.json() as Promise<T>
}

type Health = {
  status: string
}

export function useHealth() {
  return useQuery<Health>({
    queryKey: ['health'],
    queryFn: () => apiGet<Health>('/health/'),
    retry: false,
  })
}
