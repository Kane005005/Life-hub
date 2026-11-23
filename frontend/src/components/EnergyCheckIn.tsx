import { useState } from 'react'
import type { FormEvent } from 'react'
import { useFx } from '../features/fx/useFx'
import { ApiError } from '../lib/api'
import { ENERGY_LEVEL_LABELS, ENERGY_LEVELS } from '../lib/labels'
import { useEnergy, useRecordEnergy } from '../lib/queries'
import type { EnergyLevel } from '../lib/types'
import { Button } from './Button'
import { HudFrame } from './HudFrame'

function localToday(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

export function EnergyCheckIn() {
  const energy = useEnergy()
  const record = useRecordEnergy()
  const { announce } = useFx()
  const [level, setLevel] = useState<EnergyLevel | null>(null)
  const [note, setNote] = useState('')
  const [message, setMessage] = useState('')

  const current = energy.data?.results?.find((item) => item.date === localToday())

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (level === null) {
      return
    }
    setMessage('')
    try {
      await record.mutateAsync({ level, note: note.trim() })
      const confirmation = 'Bilan énergétique enregistré.'
      setMessage(confirmation)
      announce(confirmation)
    } catch (cause) {
      const detail = cause instanceof ApiError ? cause.detail : 'Enregistrement impossible.'
      setMessage(detail)
      announce(detail)
    }
  }

  return (
    <HudFrame as="section" className="lr-energy" aria-label="Bilan énergétique du jour">
      <h2 className="lr-card-title">Bilan énergétique</h2>

      {current ? (
        <p className="lr-energy-current">
          Aujourd’hui : {current.label || ENERGY_LEVEL_LABELS[current.level]}.
          {current.note ? ` ${current.note}` : ''}
        </p>
      ) : null}

      <form className="lr-energy-form" onSubmit={handleSubmit}>
        <fieldset className="lr-fieldset" role="radiogroup" aria-label="Énergie du jour">
          <legend>Comment est ton énergie aujourd’hui ?</legend>
          <div className="lr-energy-levels">
            {ENERGY_LEVELS.map((value) => (
              <label className="lr-energy-level" key={value}>
                <input
                  type="radio"
                  name="energy-level"
                  value={value}
                  checked={level === value}
                  onChange={() => setLevel(value)}
                />
                <span>{ENERGY_LEVEL_LABELS[value]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="lr-field">
          <span>Note (facultative)</span>
          <textarea rows={2} value={note} onChange={(event) => setNote(event.target.value)} />
        </label>

        <Button type="submit" variant="solid" disabled={level === null || record.isPending}>
          Enregistrer
        </Button>
      </form>

      <p className="lr-note" role="status" aria-live="polite">
        {message}
      </p>
    </HudFrame>
  )
}
