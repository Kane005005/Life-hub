import { act, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EmberCanvas } from './EmberCanvas'
import type { EmberApi } from './EmberContext'
import { useEmbers } from './useEmbers'

function stubMotion() {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: false,
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

function stubContext() {
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
  return context
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('EmberCanvas', () => {
  it('arrête la boucle requestAnimationFrame quand les braises ont disparu', () => {
    stubMotion()
    const context = stubContext()
    const callbacks: FrameRequestCallback[] = []
    const frame = vi.fn((callback: FrameRequestCallback) => {
      callbacks.push(callback)
      return callbacks.length
    })
    vi.stubGlobal('requestAnimationFrame', frame)
    vi.stubGlobal('cancelAnimationFrame', vi.fn())

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
    act(() => {
      embers.burst(30, 30, 12)
    })
    expect(frame).toHaveBeenCalledTimes(1)

    let steps = 0
    act(() => {
      while (callbacks.length > 0 && steps < 100) {
        const callback = callbacks.shift()
        if (!callback) {
          break
        }
        callback(performance.now())
        steps += 1
      }
    })

    expect(steps).toBeGreaterThan(1)
    expect(steps).toBeLessThan(100)
    expect(callbacks).toHaveLength(0)
    expect(frame).toHaveBeenCalledTimes(steps)
    expect(context.clearRect).toHaveBeenCalled()
  })
})
