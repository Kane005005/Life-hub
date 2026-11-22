import { useState } from 'react'
import type { FormEvent } from 'react'
import { Avatar } from '../components/Avatar'
import { Button } from '../components/Button'
import { HudFrame } from '../components/HudFrame'
import { ApiError } from '../lib/api'
import { AVATAR_PALETTE, CLASS_CODES, CLASS_LABELS, SILHOUETTES } from '../lib/labels'
import { useCharacter, useUpdateAvatar, useUpdateCharacter } from '../lib/queries'
import type { Character, CharacterClass, Silhouette } from '../lib/types'

type OnboardingPageProps = {
  character?: Character
}

const DEFAULT_AVATAR = {
  silhouette: 'A' as Silhouette,
  color: AVATAR_PALETTE[0],
  accent: '#EDE9DF',
}

export function OnboardingPage({ character }: OnboardingPageProps) {
  const { data } = useCharacter()
  const source = character ?? data
  const updateAvatar = useUpdateAvatar()
  const updateCharacter = useUpdateCharacter()

  const [pseudonym, setPseudonym] = useState(source?.pseudonym ?? '')
  const [bio, setBio] = useState(source?.bio ?? '')
  const [characterClass, setCharacterClass] = useState<CharacterClass>(
    source?.character_class ?? 'ARCHITECT',
  )
  const [silhouette, setSilhouette] = useState<Silhouette>(
    source?.avatar.silhouette ?? DEFAULT_AVATAR.silhouette,
  )
  const [color, setColor] = useState(source?.avatar.color ?? DEFAULT_AVATAR.color)
  const [accent, setAccent] = useState(source?.avatar.accent ?? DEFAULT_AVATAR.accent)
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
        is_onboarded: true,
      })
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.detail : 'Enregistrement impossible.')
    }
  }

  return (
    <main className="lr-onboard">
      <p className="lr-eyebrow">Première étape</p>
      <h1 className="lr-title">Crée ton personnage</h1>
      <p className="lr-lede">Choisis ta silhouette. Le reste viendra avec le temps.</p>

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
            Créer mon personnage
          </Button>
        </div>
      </HudFrame>
    </main>
  )
}
