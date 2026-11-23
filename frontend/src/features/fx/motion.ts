export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function requestFrame(callback: FrameRequestCallback): number {
  if (typeof window.requestAnimationFrame === 'function') {
    return window.requestAnimationFrame(callback)
  }
  return window.setTimeout(() => callback(performance.now()), 16)
}

export function cancelFrame(id: number): void {
  if (typeof window.cancelAnimationFrame === 'function') {
    window.cancelAnimationFrame(id)
    return
  }
  window.clearTimeout(id)
}
