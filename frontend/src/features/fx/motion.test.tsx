import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EmberCanvas } from './EmberCanvas'
import type { EmberApi } from './EmberContext'
import { LevelUpOverlay } from './LevelUpOverlay'
import { prefersReducedMotion } from './motion'
import { shake } from './shake'
import { useEmbers } from './useEmbers'

function stubMotion(reduce: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('prefers-reduced-motion') ? reduce : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  )
}

function stubCanvas() {
  const context = {
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    setTransform: vi.fn(),
    fillStyle: '',
    shadowColor: '',
    shadowBlur: 0,
  }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    context as unknown as CanvasRenderingContext2D,
  )
}

afterEach(() => {
  document.body.classList.remove('lr-shake')
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('mouvement réduit', () => {
  it('empêche burst et shake de démarrer', () => {
    stubMotion(true)
    stubCanvas()
    const frame = vi.fn(() => 1)
    vi.stubGlobal('requestAnimationFrame', frame)
    let embers: EmberApi = { burst: () => undefined }

    function Probe() {
      embers = useEmbers()
      return null
    }

    render(
      <EmberCanvas>
        <Probe />
      </EmberCanvas>,
    )
    expect(prefersReducedMotion()).toBe(true)

    act(() => {
      embers.burst(20, 20, 60)
    })
    shake()

    expect(frame).not.toHaveBeenCalled()
    expect(document.body).not.toHaveClass('lr-shake')
  })

  it('affiche la montée de niveau sans classes ni décorations animées', () => {
    stubMotion(true)

    const { container } = render(
      <LevelUpOverlay level={4} message="Niveau 4 atteint." onClose={vi.fn()} />,
    )

    const dialog = screen.getByRole('dialog', { name: 'Niveau atteint' })
    expect(dialog).toHaveClass('lr-lvlup--open')
    expect(dialog).not.toHaveClass('lr-lvlup--animated')
    expect(container.querySelector('.rays')).toBeNull()
    expect(container.querySelector('.ring')).toBeNull()
    expect(container.querySelector('.lr-lvlup-number')?.textContent).toBe('4')
  })

  it('garde les rayons, l’anneau et le pop quand le mouvement est autorisé', () => {
    stubMotion(false)

    const { container } = render(
      <LevelUpOverlay level={4} message="Niveau 4 atteint." onClose={vi.fn()} />,
    )

    expect(screen.getByRole('dialog')).toHaveClass('lr-lvlup--animated')
    expect(container.querySelector('.rays')).toBeInTheDocument()
    expect(container.querySelector('.ring')).toBeInTheDocument()
  })
})
