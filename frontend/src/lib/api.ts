import { useQuery } from '@tanstack/react-query'
import { clearToken, getToken } from './auth'

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE'

const DEFAULT_DETAILS: Record<number, string> = {
  400: 'Données invalides.',
  401: 'Connexion nécessaire.',
  403: 'Accès refusé.',
  404: 'Élément introuvable.',
  409: 'Action impossible.',
  500: 'Serveur local injoignable. Vérifie qu’il tourne, puis relance.',
}

export class ApiError extends Error {
  status: number
  detail: string

  constructor(status: number, detail: string) {
    super(detail)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}

function defaultDetail(status: number): string {
  return DEFAULT_DETAILS[status] ?? `Impossible de joindre l’API locale (${status}).`
}

async function readBody(response: Response): Promise<unknown> {
  try {
    if (typeof response.json === 'function') {
      return await response.json()
    }
  } catch {
    // Une réponse d'erreur n'est pas toujours du JSON.
  }
  return null
}

function extractDetail(body: unknown, status: number, fallback?: string): string {
  if (body && typeof body === 'object' && 'detail' in body) {
    const detail = (body as { detail?: unknown }).detail
    if (typeof detail === 'string' && detail.length > 0) {
      return detail
    }
  }
  return fallback ?? defaultDetail(status)
}

export async function apiRequest<T>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  fallbackDetail?: string,
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }
  if (token) {
    headers.Authorization = `Token ${token}`
  }

  const response = await fetch(`/api${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (response.status === 401) {
    clearToken()
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('lr:unauthorized'))
    }
  }

  if (!response.ok) {
    const errorBody = await readBody(response)
    throw new ApiError(response.status, extractDetail(errorBody, response.status, fallbackDetail))
  }

  if (response.status === 204) {
    return undefined as T
  }

  const data = await readBody(response)
  if (data === null) {
    return undefined as T
  }
  return data as T
}

export function apiGet<T>(path: string): Promise<T> {
  return apiRequest<T>('GET', path)
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
