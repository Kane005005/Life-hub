import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { ReactNode } from 'react'
import { EmberContext } from './EmberContext'
import { cancelFrame, prefersReducedMotion, requestFrame } from './motion'

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  radius: number
  color: string
}

const TWO_PI = Math.PI * 2

type EmberCanvasProps = {
  children?: ReactNode
}

export function EmberCanvas({ children }: EmberCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particles = useRef<Particle[]>([])
  const running = useRef(false)
  const frame = useRef<number | null>(null)

  const sizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }
    const ratio = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = window.innerWidth * ratio
    canvas.height = window.innerHeight * ratio
    canvas.getContext('2d')?.setTransform(ratio, 0, 0, ratio, 0, 0)
  }, [])

  const step = useCallback(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!context) {
      running.current = false
      frame.current = null
      return
    }
    context.clearRect(0, 0, window.innerWidth, window.innerHeight)
    particles.current = particles.current.filter((particle) => {
      particle.x += particle.vx
      particle.y += particle.vy
      particle.vy += 0.14
      particle.vx *= 0.985
      particle.life -= 0.016
      if (particle.life <= 0) {
        return false
      }
      context.beginPath()
      context.fillStyle = `rgba(${particle.color},${particle.life})`
      context.shadowColor = `rgba(${particle.color},1)`
      context.shadowBlur = 10
      context.arc(particle.x, particle.y, particle.radius, 0, TWO_PI)
      context.fill()
      return true
    })
    if (particles.current.length > 0) {
      frame.current = requestFrame(step)
    } else {
      running.current = false
      frame.current = null
      context.clearRect(0, 0, window.innerWidth, window.innerHeight)
    }
  }, [])

  const burst = useCallback(
    (x: number, y: number, count: number, color = '47,208,139') => {
      if (prefersReducedMotion()) {
        return
      }
      for (let index = 0; index < count; index += 1) {
        const angle = Math.random() * TWO_PI
        const speed = Math.random() * 5 + 1.5
        particles.current.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2,
          life: 1,
          radius: Math.random() * 2.4 + 0.8,
          color,
        })
      }
      if (!running.current) {
        running.current = true
        frame.current = requestFrame(step)
      }
    },
    [step],
  )

  useEffect(() => {
    sizeCanvas()
    window.addEventListener('resize', sizeCanvas)
    return () => {
      window.removeEventListener('resize', sizeCanvas)
      if (frame.current !== null) {
        cancelFrame(frame.current)
      }
      running.current = false
      particles.current = []
    }
  }, [sizeCanvas])

  const value = useMemo(() => ({ burst }), [burst])

  return (
    <EmberContext.Provider value={value}>
      <canvas ref={canvasRef} className="lr-embers" aria-hidden="true" />
      {children}
    </EmberContext.Provider>
  )
}
