import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useFx } from '../features/fx/useFx'
import { ApiError } from '../lib/api'
import { useCreateQuest, useGameSettings, useSkillTrees } from '../lib/queries'
import type { Quest } from '../lib/types'
import { Button } from './Button'
import { HudFrame } from './HudFrame'
import { QuestFields } from './QuestFields'
import type { QuestFieldErrors, QuestFieldValues } from './QuestFields'

type QuestFormProps = {
  onCreated?: (quest: Quest) => void
  onCancel?: () => void
}

function initialValues(): QuestFieldValues {
  return {
    title: '',
    description: '',
    territory: 'KNOWLEDGE',
    quest_type: 'DAILY',
    difficulty: 'EASY',
    priority: 'NORMAL',
    estimated_minutes: '30',
    start_date: '',
    due_date: '',
    validation_mode: 'MANUAL',
    skill_branch: '',
    steps: [],
  }
}

export function QuestForm({ onCreated, onCancel }: QuestFormProps) {
  const create = useCreateQuest()
  const settings = useGameSettings()
  const { announce, toast } = useFx()
  const nextStepId = useRef(1)

  const [values, setValues] = useState<QuestFieldValues>(initialValues)
  const [errors, setErrors] = useState<QuestFieldErrors>({})
  const skillTrees = useSkillTrees(values.territory)
  const branches = skillTrees.data?.[0]?.branches ?? []
  const difficultyXp = settings.data?.xp_by_difficulty[values.difficulty]

  function patch(next: Partial<QuestFieldValues>) {
    setValues((current) => ({ ...current, ...next }))
  }

  function addStep() {
    const id = nextStepId.current
    nextStepId.current += 1
    setValues((current) => ({
      ...current,
      steps: [...current.steps, { id, title: '', is_required: false }],
    }))
  }

  function updateStep(id: number, stepPatch: Partial<{ title: string; is_required: boolean }>) {
    setValues((current) => ({
      ...current,
      steps: current.steps.map((step) => (step.id === id ? { ...step, ...stepPatch } : step)),
    }))
  }

  function removeStep(id: number) {
    setValues((current) => ({
      ...current,
      steps: current.steps.filter((step) => step.id !== id),
    }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors: QuestFieldErrors = {}
    const estimated = values.estimated_minutes === '' ? undefined : Number(values.estimated_minutes)
    if (!values.title.trim()) {
      nextErrors.title = 'Donne un titre à la mission.'
    }
    if (values.estimated_minutes !== '' && (!Number.isFinite(estimated) || (estimated ?? -1) < 0)) {
      nextErrors.minutes = 'Indique une durée valide.'
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      return
    }

    try {
      const quest = await create.mutateAsync({
        title: values.title.trim(),
        description: values.description,
        territory: values.territory,
        quest_type: values.quest_type,
        difficulty: values.difficulty,
        priority: values.priority,
        estimated_minutes: estimated,
        start_date: values.start_date || null,
        due_date: values.due_date || null,
        validation_mode: values.validation_mode,
        skill_branch: values.skill_branch,
        steps: values.steps
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

      <QuestFields
        values={values}
        errors={errors}
        difficultyXp={difficultyXp}
        branches={branches}
        onChange={patch}
        onAddStep={addStep}
        onUpdateStep={updateStep}
        onRemoveStep={removeStep}
      />

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
