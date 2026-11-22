export type SfxKind = 'ok' | 'boss' | 'lvl' | 'rest' | 'ach'

interface AudioWindow extends Window {
  webkitAudioContext?: typeof AudioContext
}

let enabled = false
let context: AudioContext | null = null

function audioContext(): AudioContext | null {
  if (typeof window === 'undefined') {
    return null
  }
  if (context) {
    return context
  }
  try {
    const Constructor = window.AudioContext ?? (window as AudioWindow).webkitAudioContext
    if (!Constructor) {
      return null
    }
    context = new Constructor()
    return context
  } catch {
    return null
  }
}

function tone(
  ac: AudioContext,
  frequency: number,
  offset: number,
  duration: number,
  volume = 0.07,
  type: OscillatorType = 'sine',
) {
  const start = ac.currentTime + offset
  const oscillator = ac.createOscillator()
  const gain = ac.createGain()
  oscillator.type = type
  oscillator.frequency.value = frequency
  gain.gain.setValueAtTime(0, start)
  gain.gain.linearRampToValueAtTime(volume, start + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  oscillator.connect(gain)
  gain.connect(ac.destination)
  oscillator.start(start)
  oscillator.stop(start + duration + 0.05)
}

export function isSoundEnabled(): boolean {
  return enabled
}

export function setSoundEnabled(value: boolean): void {
  enabled = value
  if (!value) {
    return
  }
  const ac = audioContext()
  if (ac?.state === 'suspended') {
    void ac.resume()
  }
}

export function playSfx(kind: SfxKind): void {
  if (!enabled) {
    return
  }
  const ac = audioContext()
  if (!ac) {
    return
  }
  if (ac.state === 'suspended') {
    void ac.resume()
  }
  try {
    if (kind === 'ok') {
      tone(ac, 523, 0, 0.18)
      tone(ac, 784, 0.08, 0.3)
    } else if (kind === 'boss') {
      tone(ac, 110, 0, 0.5, 0.12, 'triangle')
      tone(ac, 165, 0.05, 0.6, 0.08, 'triangle')
      tone(ac, 660, 0.2, 0.4)
    } else if (kind === 'lvl') {
      const notes = [392, 494, 587, 784, 988]
      notes.forEach((frequency, index) => {
        tone(ac, frequency, index * 0.1, 0.5, 0.07)
      })
    } else if (kind === 'rest') {
      tone(ac, 220, 0, 0.7, 0.05)
    } else if (kind === 'ach') {
      tone(ac, 880, 0, 0.12)
      tone(ac, 1175, 0.1, 0.3)
    }
  } catch {
    // Le son reste facultatif : une erreur audio ne doit jamais bloquer le jeu.
  }
}
