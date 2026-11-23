import { prefersReducedMotion } from './motion'

export function shake(): void {
  if (prefersReducedMotion() || typeof document === 'undefined') {
    return
  }
  document.body.classList.remove('lr-shake')
  void document.body.offsetWidth
  document.body.classList.add('lr-shake')
  window.setTimeout(() => {
    document.body.classList.remove('lr-shake')
  }, 500)
}
