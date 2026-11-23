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
import type { Difficulty, Priority, QuestType, TerritoryCode, ValidationMode } from '../lib/types'
import { Button } from './Button'

export type QuestFieldStep = {
  id: number
  title: string
  is_required: boolean
}

export type QuestFieldValues = {
  title: string
  description: string
  territory: TerritoryCode
  quest_type: QuestType
  difficulty: Difficulty
  priority: Priority
  estimated_minutes: string
  start_date: string
  due_date: string
  validation_mode: ValidationMode
  skill_branch: string
  steps: QuestFieldStep[]
}

export type QuestFieldErrors = Record<string, string>

type QuestFieldsProps = {
  values: QuestFieldValues
  errors?: QuestFieldErrors
  difficultyXp?: number
  branches?: { code: string; name: string }[]
  onChange: (patch: Partial<QuestFieldValues>) => void
  onAddStep: () => void
  onUpdateStep: (id: number, patch: Partial<QuestFieldStep>) => void
  onRemoveStep: (id: number) => void
}

/** Champs partagés entre la création d'une mission et l'édition d'une proposition. */
export function QuestFields({
  values,
  errors = {},
  difficultyXp,
  branches = [],
  onChange,
  onAddStep,
  onUpdateStep,
  onRemoveStep,
}: QuestFieldsProps) {
  return (
    <>
      <label className="lr-field">
        <span>Titre</span>
        <input
          type="text"
          name="title"
          required
          value={values.title}
          onChange={(event) => onChange({ title: event.target.value })}
        />
        {errors.title ? <span className="lr-field-error">{errors.title}</span> : null}
      </label>

      <label className="lr-field">
        <span>Description</span>
        <textarea
          name="description"
          rows={3}
          value={values.description}
          onChange={(event) => onChange({ description: event.target.value })}
        />
      </label>

      <div className="lr-form-grid">
        <label className="lr-field">
          <span>Territoire</span>
          <select
            name="territory"
            value={values.territory}
            onChange={(event) =>
              onChange({ territory: event.target.value as TerritoryCode, skill_branch: '' })
            }
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
            value={values.quest_type}
            onChange={(event) => onChange({ quest_type: event.target.value as QuestType })}
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
            value={values.difficulty}
            onChange={(event) => onChange({ difficulty: event.target.value as Difficulty })}
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
            value={values.priority}
            onChange={(event) => onChange({ priority: event.target.value as Priority })}
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
            value={values.estimated_minutes}
            onChange={(event) => onChange({ estimated_minutes: event.target.value })}
          />
          {errors.minutes ? <span className="lr-field-error">{errors.minutes}</span> : null}
        </label>

        <label className="lr-field">
          <span>Date de début</span>
          <input
            type="date"
            name="start_date"
            value={values.start_date}
            onChange={(event) => onChange({ start_date: event.target.value })}
          />
        </label>

        <label className="lr-field">
          <span>Échéance</span>
          <input
            type="date"
            name="due_date"
            value={values.due_date}
            onChange={(event) => onChange({ due_date: event.target.value })}
          />
        </label>

        <label className="lr-field">
          <span>Mode de validation</span>
          <select
            name="validation_mode"
            value={values.validation_mode}
            onChange={(event) =>
              onChange({ validation_mode: event.target.value as ValidationMode })
            }
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
          value={values.skill_branch}
          onChange={(event) => onChange({ skill_branch: event.target.value })}
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
        {values.steps.map((step, index) => (
          <div key={step.id} className="lr-step-editor">
            <input
              type="text"
              aria-label={`Étape ${index + 1}`}
              value={step.title}
              onChange={(event) => onUpdateStep(step.id, { title: event.target.value })}
            />
            <label className="lr-step-required">
              <input
                type="checkbox"
                checked={step.is_required}
                onChange={(event) => onUpdateStep(step.id, { is_required: event.target.checked })}
              />
              Obligatoire
            </label>
            <button type="button" className="lr-step-remove" onClick={() => onRemoveStep(step.id)}>
              Retirer
            </button>
          </div>
        ))}
        <Button variant="quiet" onClick={onAddStep}>
          Ajouter une étape
        </Button>
      </fieldset>
    </>
  )
}
