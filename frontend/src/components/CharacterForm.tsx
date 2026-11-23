import { useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError } from '../lib/api'
import { AVATAR_PALETTE, CLASS_CODES, CLASS_LABELS, SILHOUETTES } from '../lib/labels'
import { useUpdateAvatar, useUpdateCharacter } from '../lib/queries'
import type { Character, CharacterClass, Silhouette } from '../lib/types'
import { Avatar } from './Avatar'
import { Button } from './Button'
import { HudFrame } from './HudFrame'

type CharacterFormProps = {
  character: Character
  submitLabel: string
  onboarding?: boolean
  onSaved?: () => void
}

export function CharacterForm({
  character,
  submitLabel,
  onboarding = false,
  onSaved,
}: CharacterFormProps) {
  const updateAvatar = useUpdateAvatar()
  const updateCharacter = useUpdateCharacter()

  const [pseudonym, setPseudonym] = useState(character.pseudonym)
  const [bio, setBio] = useState(character.bio)
  const [characterClass, setCharacterClass] = useState<CharacterClass>(character.character_class)
  const [silhouette, setSilhouette] = useState<Silhouette>(character.avatar.silhouette)
  const [color, setColor] = useState(character.avatar.color)
  const [accent, setAccent] = useState(character.avatar.accent)
  const [error, setError] = useState('')

  const isSaving = updateAvatar.isPending || updateCharacter.isPending

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    try {
      await updateAvatar.mutateAsync({ silhouette, color, accent })
      await updateCharacter.mutateAsync({
        pseudonym,
        bio,
        character_class: characterClass,
        ...(onboarding ? { is_onboarded: true } : {}),
      })
      onSaved?.()
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.detail : 'Enregistrement impossible.')
    }
  }

  return (
    <HudFrame as="form" className="lr-onboard-grid" onSubmit={handleSubmit}>
      <div className="lr-onboard-fields">
        <label className="lr-field">
          <span>Pseudonyme</span>
          <input
            type="text"
            name="pseudonym"
            required
            maxLength={40}
            value={pseudonym}
            onChange={(event) => setPseudonym(event.target.value)}
          />
        </label>

        <fieldset className="lr-fieldset">
          <legend>Classe</legend>
          <div className="lr-choices">
            {CLASS_CODES.map((code) => (
              <label key={code} className="lr-choice">
                <input
                  type="radio"
                  name="character_class"
                  value={code}
                  checked={characterClass === code}
                  onChange={() => setCharacterClass(code)}
                />
                <span>{CLASS_LABELS[code]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="lr-field">
          <span>Biographie</span>
          <textarea
            name="bio"
            rows={3}
            value={bio}
            onChange={(event) => setBio(event.target.value)}
          />
        </label>

        <fieldset className="lr-fieldset">
          <legend>Silhouette</legend>
          <div className="lr-choices">
            {SILHOUETTES.map((code) => (
              <label key={code} className="lr-choice">
                <input
                  type="radio"
                  name="silhouette"
                  value={code}
                  checked={silhouette === code}
                  onChange={() => setSilhouette(code)}
                />
                <span>Silhouette {code}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="lr-fieldset">
          <legend>Couleur</legend>
          <div className="lr-swatches">
            {AVATAR_PALETTE.map((hex) => (
              <label key={`color-${hex}`} className="lr-swatch">
                <input
                  type="radio"
                  name="color"
                  value={hex}
                  checked={color === hex}
                  aria-label={`Couleur ${hex}`}
                  onChange={() => setColor(hex)}
                />
                <span style={{ background: hex }} />
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="lr-fieldset">
          <legend>Accent</legend>
          <div className="lr-swatches">
            {AVATAR_PALETTE.map((hex) => (
              <label key={`accent-${hex}`} className="lr-swatch">
                <input
                  type="radio"
                  name="accent"
                  value={hex}
                  checked={accent === hex}
                  aria-label={`Accent ${hex}`}
                  onChange={() => setAccent(hex)}
                />
                <span style={{ background: hex }} />
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="lr-avatar-preview">
        <Avatar
          silhouette={silhouette}
          color={color}
          accent={accent}
          label="Aperçu de ton avatar"
        />
        <p className="lr-note">Aperçu en direct.</p>
      </div>

      {error ? (
        <p role="alert" className="lr-login-error">
          {error}
        </p>
      ) : null}

      <div className="lr-onboard-actions">
        <Button type="submit" variant="solid" disabled={isSaving}>
          {submitLabel}
        </Button>
        {onSaved ? (
          <Button variant="quiet" onClick={onSaved}>
            Annuler
          </Button>
        ) : null}
      </div>
    </HudFrame>
  )
}
