import { useEffect, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { useFx } from '../features/fx/useFx'
import { ApiError } from '../lib/api'
import type { CssVars } from '../lib/css'
import { formatDate, formatDateTime } from '../lib/format'
import {
  DIFFICULTY_LABELS,
  PRIORITY_LABELS,
  PROPOSAL_STATUS_LABELS,
  QUEST_TYPE_LABELS,
  TERRITORY_BY_CODE,
  TERRITORY_LABELS,
} from '../lib/labels'
import {
  useAcceptProposal,
  useRejectProposal,
  useSkillTrees,
  useUpdateProposal,
} from '../lib/queries'
import type { ProposalUpdate, QuestProposal } from '../lib/types'
import { Button } from './Button'
import { QuestFields } from './QuestFields'
import type { QuestFieldStep, QuestFieldValues } from './QuestFields'

const ACCEPT_MESSAGE =
  "Mission ajoutée à ton journal de quêtes. Elle ne rapporte rien tant que tu ne l'as pas validée."
const REJECT_MESSAGE = 'Proposition refusée.'

function initialValues(proposal: QuestProposal): QuestFieldValues {
  return {
    title: proposal.title,
    description: proposal.description ?? '',
    territory: proposal.territory,
    quest_type: proposal.quest_type,
    difficulty: proposal.difficulty,
    priority: proposal.priority,
    estimated_minutes: String(proposal.estimated_minutes ?? ''),
    start_date: '',
    due_date: proposal.due_date ?? '',
    validation_mode: 'MANUAL',
    skill_branch: proposal.skill_branch ?? '',
    steps: (proposal.steps ?? []).map((step, index) => ({
      id: index + 1,
      title: step.title,
      is_required: step.is_required,
    })),
  }
}

function toProposalInput(values: QuestFieldValues): ProposalUpdate {
  return {
    title: values.title.trim(),
    description: values.description,
    territory: values.territory,
    quest_type: values.quest_type,
    difficulty: values.difficulty,
    priority: values.priority,
    estimated_minutes:
      values.estimated_minutes === '' ? undefined : Number(values.estimated_minutes),
    due_date: values.due_date || null,
    skill_branch: values.skill_branch,
    steps: values.steps
      .filter((step) => step.title.trim())
      .map((step) => ({ title: step.title.trim(), is_required: step.is_required })),
  }
}

type ProposalEditFormProps = {
  proposal: QuestProposal
  busy: boolean
  onSave: (input: ProposalUpdate) => Promise<void>
  onAccept: (input: ProposalUpdate) => Promise<void>
  onCancel: () => void
}

function ProposalEditForm({ proposal, busy, onSave, onAccept, onCancel }: ProposalEditFormProps) {
  const [values, setValues] = useState<QuestFieldValues>(() => initialValues(proposal))
  const [error, setError] = useState('')
  const nextStepId = useRef((proposal.steps ?? []).length + 1)
  const skillTrees = useSkillTrees(values.territory)
  const branches = skillTrees.data?.[0]?.branches ?? []

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

  function updateStep(id: number, stepPatch: Partial<QuestFieldStep>) {
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

  async function submit(kind: 'save' | 'accept') {
    if (!values.title.trim()) {
      setError('Donne un titre à la mission.')
      return
    }
    setError('')
    try {
      if (kind === 'save') {
        await onSave(toProposalInput(values))
      } else {
        await onAccept(toProposalInput(values))
      }
    } catch {
      setError('Enregistrement impossible. Réessaie.')
    }
  }

  return (
    <div className="lr-prop-edit">
      <h4 className="lr-prop-edit-title">Modifier la proposition</h4>
      <QuestFields
        values={values}
        branches={branches}
        onChange={patch}
        onAddStep={addStep}
        onUpdateStep={updateStep}
        onRemoveStep={removeStep}
      />
      {error ? (
        <p role="alert" className="lr-field-error">
          {error}
        </p>
      ) : null}
      <div className="lr-form-actions">
        <Button variant="solid" onClick={() => void submit('accept')} disabled={busy}>
          Accepter avec ces modifications
        </Button>
        <Button onClick={() => void submit('save')} disabled={busy}>
          Enregistrer
        </Button>
        <Button variant="quiet" onClick={onCancel} disabled={busy}>
          Annuler
        </Button>
      </div>
    </div>
  )
}

export function ProposalCard({ proposal }: { proposal: QuestProposal }) {
  const accept = useAcceptProposal()
  const update = useUpdateProposal()
  const reject = useRejectProposal()
  const { announce, toast } = useFx()
  const [editing, setEditing] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const cancelRef = useRef<HTMLButtonElement>(null)

  const isPending = proposal.status === 'PENDING'
  const link = TERRITORY_BY_CODE[proposal.territory]
  const cardStyle: CssVars = { '--c': link.color }
  const busy = accept.isPending || update.isPending || reject.isPending

  useEffect(() => {
    if (!rejecting) {
      return
    }
    cancelRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setRejecting(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [rejecting])

  function showError(cause: unknown) {
    const detail = cause instanceof ApiError ? cause.detail : 'Action impossible.'
    setError(detail)
    announce(detail)
  }

  function report(messageText: string) {
    setMessage(messageText)
    announce(messageText)
    toast(messageText)
  }

  async function handleAccept(input?: ProposalUpdate) {
    setError('')
    try {
      await accept.mutateAsync(input ? { id: proposal.id, input } : { id: proposal.id })
      setEditing(false)
      report(ACCEPT_MESSAGE)
    } catch (cause) {
      showError(cause)
    }
  }

  async function handleSave(input: ProposalUpdate) {
    setError('')
    try {
      await update.mutateAsync({ id: proposal.id, input })
      setEditing(false)
      report('Proposition enregistrée.')
    } catch (cause) {
      showError(cause)
    }
  }

  async function handleReject() {
    setError('')
    try {
      await reject.mutateAsync({ id: proposal.id, reason: reason.trim() })
      setRejecting(false)
      report(REJECT_MESSAGE)
    } catch (cause) {
      showError(cause)
    }
  }

  function openReject(event: MouseEvent<HTMLButtonElement>) {
    event.currentTarget.blur()
    setReason('')
    setRejecting(true)
  }

  return (
    <article className="lr-prop" style={cardStyle} aria-label={`Proposition : ${proposal.title}`}>
      <div className="lr-prop-head">
        <p className="lr-prop-agent">
          Proposée par {proposal.agent_name} · {formatDateTime(proposal.created_at)}
        </p>
        <span className="lr-pill">{PROPOSAL_STATUS_LABELS[proposal.status]}</span>
      </div>

      <h3 className="lr-prop-title">{proposal.title}</h3>
      {proposal.rationale ? <p className="lr-prop-rationale">{proposal.rationale}</p> : null}

      <div className="lr-q-meta">
        <span className="lr-pill lr-pill--territory">{TERRITORY_LABELS[proposal.territory]}</span>
        <span className="lr-pill">{QUEST_TYPE_LABELS[proposal.quest_type]}</span>
        <span className="lr-pill">{DIFFICULTY_LABELS[proposal.difficulty]}</span>
        <span className="lr-pill">{PRIORITY_LABELS[proposal.priority]}</span>
        <span className="lr-pill lr-pill--indicative">+{proposal.xp_preview} XP indicatifs</span>
        {proposal.due_date ? (
          <span className="lr-pill">Échéance {formatDate(proposal.due_date)}</span>
        ) : null}
      </div>

      {proposal.steps.length > 0 ? (
        <ol className="lr-prop-steps">
          {proposal.steps.map((step, index) => (
            <li key={`${step.title}-${index}`}>
              {step.title}
              {step.is_required ? <span className="lr-q-required"> obligatoire</span> : null}
            </li>
          ))}
        </ol>
      ) : null}

      {!isPending ? (
        <div className="lr-prop-decided">
          <p className="lr-prop-decision">
            {PROPOSAL_STATUS_LABELS[proposal.status]}
            {proposal.decided_at ? ` le ${formatDateTime(proposal.decided_at)}` : ''}
          </p>
          {proposal.status === 'REJECTED' && proposal.reject_reason ? (
            <p className="lr-prop-reason">Motif : {proposal.reject_reason}</p>
          ) : null}
          {proposal.status === 'ACCEPTED' && proposal.quest !== null ? (
            <Link className="lr-prop-link" to={`/missions?quest=${proposal.quest}`}>
              Voir la mission dans le journal de quêtes
            </Link>
          ) : null}
        </div>
      ) : editing ? (
        <ProposalEditForm
          proposal={proposal}
          busy={busy}
          onSave={handleSave}
          onAccept={handleAccept}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <div className="lr-prop-actions">
          <Button variant="solid" onClick={() => void handleAccept()} disabled={busy}>
            Accepter
          </Button>
          <Button onClick={() => setEditing(true)} disabled={busy}>
            Modifier
          </Button>
          <Button variant="quiet" onClick={openReject} disabled={busy}>
            Refuser
          </Button>
        </div>
      )}

      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {message}
      </p>
      {error ? (
        <p role="alert" className="lr-q-error">
          {error}
        </p>
      ) : null}

      {rejecting ? (
        <div
          className="lr-q-dialog"
          role="dialog"
          aria-modal="true"
          aria-label="Refuser cette proposition ?"
        >
          <p>Refuser cette proposition ? Le motif est facultatif.</p>
          <label className="lr-field">
            <span>Motif (facultatif)</span>
            <textarea rows={2} value={reason} onChange={(event) => setReason(event.target.value)} />
          </label>
          <div className="lr-q-dialog-actions">
            <button
              ref={cancelRef}
              type="button"
              className="lr-btn lr-btn--quiet"
              onClick={() => setRejecting(false)}
            >
              Annuler
            </button>
            <Button variant="solid" onClick={() => void handleReject()} disabled={busy}>
              Refuser
            </Button>
          </div>
        </div>
      ) : null}
    </article>
  )
}
