import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type SoundModule = typeof import('./sound')

type AudioHarness = {
  Constructor: ReturnType<typeof vi.fn>
  context: {
    currentTime: number
    state: string
    destination: object
    createOscillator: ReturnType<typeof vi.fn>
    createGain: ReturnType<typeof vi.fn>
    resume: ReturnType<typeof vi.fn>
  }
  oscillator: {
    type: OscillatorType
    frequency: { value: number }
    connect: ReturnType<typeof vi.fn>
    start: ReturnType<typeof vi.fn>
    stop: ReturnType<typeof vi.fn>
  }
}

function installAudio(): AudioHarness {
  const oscillator = {
    type: 'sine' as OscillatorType,
    frequency: { value: 0 },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  }
  const gain = {
    gain: {
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
  }
  const context = {
    currentTime: 0,
    state: 'running',
    destination: {},
    createOscillator: vi.fn(() => oscillator),
    createGain: vi.fn(() => gain),
    resume: vi.fn(async () => undefined),
  }
  const Constructor = vi.fn(function FakeAudioContext() {
    return context
  })
  vi.stubGlobal('AudioContext', Constructor)
  return { Constructor, context, oscillator }
}

let audio: AudioHarness
let sound: SoundModule

beforeEach(async () => {
  vi.resetModules()
  audio = installAudio()
  sound = await import('./sound')
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('son', () => {
  it('ne crée ni contexte ni oscillateur sans activation', () => {
    expect(sound.isSoundEnabled()).toBe(false)

    sound.playSfx('ok')

    expect(audio.Constructor).not.toHaveBeenCalled()
    expect(audio.context.createOscillator).not.toHaveBeenCalled()
  })

  it('ne joue rien lors de la restauration du réglage sans nouvelle activation', () => {
    sound.setSoundEnabled(true)
    sound.playSfx('ok')

    expect(sound.isSoundEnabled()).toBe(true)
    expect(audio.Constructor).not.toHaveBeenCalled()
    expect(audio.context.createOscillator).not.toHaveBeenCalled()
  })

  it('crée le contexte à la première activation explicite', () => {
    sound.setSoundEnabled(true, true)

    expect(audio.Constructor).toHaveBeenCalledTimes(1)
    expect(audio.context.createOscillator).not.toHaveBeenCalled()

    sound.playSfx('ok')

    expect(audio.context.createOscillator).toHaveBeenCalledTimes(2)
    expect(audio.oscillator.start).toHaveBeenCalledTimes(2)
  })

  it('reste silencieux après désactivation', () => {
    sound.setSoundEnabled(true, true)
    sound.playSfx('ok')
    const calls = audio.context.createOscillator.mock.calls.length

    sound.setSoundEnabled(false)
    sound.playSfx('boss')

    expect(sound.isSoundEnabled()).toBe(false)
    expect(audio.context.createOscillator).toHaveBeenCalledTimes(calls)
  })
})
