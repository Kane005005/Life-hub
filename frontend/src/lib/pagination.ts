/** Convertit le lien `next` de l'API en chemin relatif attendu par `apiGet`. */
export function nextApiPath(next: string): string {
  const url = new URL(next, window.location.origin)
  const path = url.pathname.startsWith('/api') ? url.pathname.slice(4) : url.pathname
  return `${path}${url.search}`
}
