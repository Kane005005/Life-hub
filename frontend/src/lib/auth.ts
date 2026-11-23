const TOKEN_KEY = 'lr-token'

export function getToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string): void {
  try {
    window.localStorage.setItem(TOKEN_KEY, token)
  } catch {
    // Stockage indisponible : la session reste valable jusqu'au rechargement.
  }
}

export function clearToken(): void {
  try {
    window.localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Rien à nettoyer si le stockage est indisponible.
  }
}
