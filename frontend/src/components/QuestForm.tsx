import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useFx } from '../features/fx/useFx'
import { ApiError } from '../lib/api'
import {
  DIFFICULTY_CODES,
  DIFFICULTY_LABELS,
  PRIORITY_CODES,
  PRIORITY_LABELS,
  QUEST_TYPE_CODES,
  QUEST_TYPE_LABELS,
  TERRITORY_CODES,
  TERRITORY_LABELS,
} from '../lib/labels'
import { useCreateQuest, useGameSettings, useSkillTrees } from '../lib/queries'
import type {
  Difficulty,
  Priority,
  Quest,
  QuestType,
  TerritoryCode,
  ValidationMode,
} from '../lib/types'
import { Button } from './Button'
import { HudFrame } from './HudFrame'

type QuestFormProps = {
  onCreated?: (quest: Quest) => void
  onCancel?: () => void
}

type FormStep = {
  id: number
  title: string
  is_required: boolean
}

export function QuestForm({ onCreated, onCancel }: QuestFormProps) {
  const create = useCreateQuest()
  const settings = useGameSettings()
  const { announce, toast } = useFx()
  const nextStepId = useRef(1)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [territory, setTerritory] = useState<TerritoryCode>('KNOWLEDGE')
  const [questType, setQuestType] = useState<QuestType>('DAILY')
  const [difficulty, setDifficulty] = useState<Difficulty>('EASY')
  const [priority, setPriority] = useState<Priority>('NORMAL')
  const [minutes, setMinutes] = useState('30')
  const [startDate, setStartDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [validationMode, setValidationMode] = useState<ValidationMode>('MANUAL')
  const [skillBranch, setSkillBranch] = useState('')
  const [steps, setSteps] = useState<FormStep[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const skillTrees = useSkillTrees(territory)
  const branches = skillTrees.data?.[0]?.branches ?? []

  const difficultyXp = settings.data?.xp_by_difficulty[difficulty]

  function addStep() {
    const id = nextStepId.current
    nextStepId.current += 1
    setSteps((current) => [...current, { id, title: '', is_required: false }])
  }

  function updateStep(id: number, patch: Partial<FormStep>) {
    setSteps((current) => current.map((step) => (step.id === id ? { ...step, ...patch } : step)))
  }

  function removeStep(id: number) {
    setSteps((current) => current.filter((step) => step.id !== id))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors: Record<string, string> = {}
    const estimated = minutes === '' ? undefined : Number(minutes)
    if (!title.trim()) {
      nextErrors.title = 'Donne un titre à la mission.'
    }
    if (minutes !== '' && (!Number.isFinite(estimated) || (estimated ?? -1) < 0)) {
      nextErrors.minutes = 'Indique une durée valide.'
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      return
    }

    try {
      const quest = await create.mutateAsync({
        title: title.trim(),
        description,
        territory,
        quest_type: questType,
        difficulty,
        priority,
        estimated_minutes: estimated,
        start_date: startDate || null,
        due_date: dueDate || null,
        validation_mode: validationMode,
        skill_branch: skillBranch,
        steps: steps
          .filter((step) => step.title.trim())
          .map((step) => ({ title: step.title.trim(), is_required: step.is_required })),
      })
      const message = 'Mission créée.'
      announce(message)
      toast(message)
      onCreated?.(quest)
    } catch (cause) {
      const detail = cause instanceof ApiError ? cause.detail : 'Création impossible.'
      setErrors({ api: detail })
      announce(detail)
    }
  }

  return (
    <HudFrame as="form" className="lr-quest-form" onSubmit={handleSubmit}>
      <h3 className="lr-form-title">Nouvelle mission</h3>

      <label className="lr-field">
        <span>Titre</span>
        <input
          type="text"
          name="title"
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        {errors.title ? <span className="lr-field-error">{errors.title}</span> : null}
      </label>

      <label className="lr-field">
        <span>Description</span>
        <textarea
          name="description"
          rows={3}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </label>

      <div className="lr-form-grid">
        <label className="lr-field">
          <span>Territoire</span>
          <select
            name="territory"
            value={territory}
            onChange={(event) => {
              setTerritory(event.target.value as TerritoryCode)
              setSkillBranch('')
            }}
          >
            {TERRITORY_CODES.map((code) => (
              <option key={code} value={code}>
                {TERRITORY_LABELS[code]}
              </option>
            ))}
          </select>
        </label>

        <label className="lr-field">
          <span>Type</span>
          <select
            name="quest_type"
            value={questType}
            onChange={(event) => setQuestType(event.target.value as QuestType)}
          >
            {QUEST_TYPE_CODES.map((code) => (
              <option key={code} value={code}>
                {QUEST_TYPE_LABELS[code]}
              </option>
            ))}
          </select>
        </label>

        <label className="lr-field">
          <span>Difficulté</span>
          <select
            name="difficulty"
            value={difficulty}
            onChange={(event) => setDifficulty(event.target.value as Difficulty)}
          >
            {DIFFICULTY_CODES.map((code) => (
              <option key={code} value={code}>
                {DIFFICULTY_LABELS[code]}
              </option>
            ))}
          </select>
          <span className="lr-field-help">
            XP prévue : {difficultyXp === undefined ? '…' : difficultyXp}
          </span>
        </label>

        <label className="lr-field">
          <span>Priorité</span>
          <select
            name="priority"
            value={priority}
            onChange={(event) => setPriority(event.target.value as Priority)}
          >
            {PRIORITY_CODES.map((code) => (
              <option key={code} value={code}>
                {PRIORITY_LABELS[code]}
              </option>
            ))}
          </select>
        </label>

        <label className="lr-field">
          <span>Durée estimée, en minutes</span>
          <input
            type="number"
            name="estimated_minutes"
            min={0}
            value={minutes}
            onChange={(event) => setMinutes(event.target.value)}
          />
          {errors.minutes ? <span className="lr-field-error">{errors.minutes}</span> : null}
        </label>

        <label className="lr-field">
          <span>Date de début</span>
          <input
            type="date"
            name="start_date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
        </label>

        <label className="lr-field">
          <span>Échéance</span>
          <input
            type="date"
            name="due_date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
          />
        </label>

        <label className="lr-field">
          <span>Mode de validation</span>
          <select
            name="validation_mode"
            value={validationMode}
            onChange={(event) => setValidationMode(event.target.value as ValidationMode)}
          >
            <option value="MANUAL">Manuelle</option>
            <option value="PROOF">Preuve</option>
          </select>
        </label>
      </div>

      <label className="lr-field">
        <span>Branche de compétence</span>
        <select
          name="skill_branch"
          value={skillBranch}
          onChange={(event) => setSkillBranch(event.target.value)}
        >
          <option value="">Aucune branche</option>
          {branches.map((branch) => (
            <option key={branch.code} value={branch.code}>
              {branch.name}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="lr-fieldset">
        <legend>Étapes</legend>
        {steps.map((step, index) => (
          <div key={step.id} className="lr-step-editor">
            <input
              type="text"
              aria-label={`Étape ${index + 1}`}
              value={step.title}
              onChange={(event) => updateStep(step.id, { title: event.target.value })}
            />
            <label className="lr-step-required">
              <input
                type="checkbox"
                checked={step.is_required}
                onChange={(event) => updateStep(step.id, { is_required: event.target.checked })}
              />
              Obligatoire
            </label>
            <button type="button" className="lr-step-remove" onClick={() => removeStep(step.id)}>
              Retirer
            </button>
          </div>
        ))}
        <Button variant="quiet" onClick={addStep}>
          Ajouter une étape
        </Button>
      </fieldset>

      {errors.api ? (
        <p role="alert" className="lr-field-error">
          {errors.api}
        </p>
      ) : null}

      <div className="lr-form-actions">
        <Button type="submit" variant="solid" disabled={create.isPending}>
          Créer la mission
        </Button>
        {onCancel ? (
          <Button variant="quiet" onClick={onCancel}>
            Annuler
          </Button>
        ) : null}
      </div>
    </HudFrame>
  )
}
