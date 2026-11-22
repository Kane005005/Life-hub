type SoundToggleProps = {
  enabled: boolean
  onToggle: () => void
}

export function SoundToggle({ enabled, onToggle }: SoundToggleProps) {
  return (
    <button type="button" className="lr-snd" aria-pressed={enabled} onClick={onToggle}>
      Son : {enabled ? 'oui' : 'non'}
    </button>
  )
}
