import { useState, type FormEvent } from 'react'
import { Icon } from './Icon'
import { currentStage, stageStatusLabels, workflowProgress } from '../domain/workflow'
import type { Program, WorkflowStage, WorkflowStageUpdate } from '../types/domain'

export function ProgramWorkflow({ program, onSave }: {
  program: Program
  onSave: (stageId: number, update: WorkflowStageUpdate) => Promise<void>
}) {
  const [selectedId, setSelectedId] = useState(currentStage(program.workflow)?.id)
  const [saving, setSaving] = useState(false)
  const selected = program.workflow.find(stage => stage.id === selectedId) ?? currentStage(program.workflow)
  const done = program.workflow.filter(stage => stage.status === 'done').length
  if (!selected) return <section className="card empty-state">У программы пока нет этапов.</section>

  return <div className="dashboard-grid program-workflow">
    <section className="card workflow-card">
      <div className="card-header"><div><h2>Этапы программы</h2><p>{program.name} · {program.product}</p></div><span className="workflow-count">{done} из {program.workflow.length} выполнено</span></div>
      <div className="workflow-progress"><progress aria-label="Прогресс программы" max={100} value={workflowProgress(program.workflow)} /><strong>{workflowProgress(program.workflow)}%</strong></div>
      <div className="workflow">{program.workflow.map(stage => <button key={stage.id} disabled={saving} aria-pressed={selected.id === stage.id} aria-label={`${stage.order}. ${stage.title}: ${stageStatusLabels[stage.status]}`} className={`stage ${stage.status} ${selected.id === stage.id ? 'selected' : ''}`} onClick={() => setSelectedId(stage.id)}>
        <span className="stage-marker">{stage.status === 'done' ? <Icon name="check" size={16} /> : stage.order}</span>
        <span className="stage-copy"><strong>{stage.shortTitle}</strong><span>{stageStatusLabels[stage.status]}</span></span>
      </button>)}</div>
    </section>
    <StageEditor key={selected.id} stage={selected} onSave={async update => {
      setSaving(true)
      try { await onSave(selected.id, update) } finally { setSaving(false) }
    }} />
  </div>
}

function StageEditor({ stage, onSave }: { stage: WorkflowStage; onSave: (update: WorkflowStageUpdate) => Promise<void> }) {
  const [draft, setDraft] = useState<WorkflowStageUpdate>({ status: stage.status, owner: stage.owner ?? '', date: stage.date ?? '', note: stage.note ?? '' })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  function change(update: Partial<WorkflowStageUpdate>) {
    setDraft(previous => ({ ...previous, ...update }))
    setMessage('')
    setError('')
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setMessage('')
    setError('')
    try {
      await onSave(draft)
      setMessage('Изменения сохранены')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Не удалось сохранить изменения. Попробуйте ещё раз.')
    } finally { setSaving(false) }
  }
  return <section className="card stage-detail">
    <div className="card-header"><div><span className="detail-kicker">ЭТАП {stage.order}</span><h2>{stage.title}</h2></div></div>
    <form className="stage-form" onSubmit={submit}>
      <fieldset disabled={saving}>
        <label>Статус<select value={draft.status} onChange={event => change({ status: event.target.value as WorkflowStage['status'] })}>{Object.entries(stageStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Ответственный<input maxLength={120} value={draft.owner} onChange={event => change({ owner: event.target.value })} placeholder="Фамилия и инициалы" /></label>
        <label>Дата начала<input type="date" value={draft.date} onChange={event => change({ date: event.target.value })} /></label>
        <label>Комментарий<textarea maxLength={2000} rows={3} value={draft.note} onChange={event => change({ note: event.target.value })} placeholder="Результат этапа или следующий шаг" /></label>
        <button className="primary-button" type="submit">{saving ? 'Сохранение…' : 'Сохранить этап'}</button>
      </fieldset>
      <p className="save-message" role="status">{message}</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <p className="demo-note">Демо: изменения доступны до перезагрузки страницы.</p>
    </form>
  </section>
}
