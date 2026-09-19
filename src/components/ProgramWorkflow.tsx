import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Icon } from './Icon'
import { currentStage, stageStatusLabels, workflowProgress } from '../domain/workflow'
import type { Program, WorkflowStage, WorkflowStageUpdate } from '../types/domain'

export function ProgramWorkflow({ program, onSave, onUpload, onDeleteAttachment }: {
  program: Program
  onSave: (stageId: number, update: WorkflowStageUpdate) => Promise<void>
  onUpload: (stageId: number, file: File) => Promise<void>
  onDeleteAttachment: (stageId: number, attachmentId: number) => Promise<void>
}) {
  const [selectedId, setSelectedId] = useState(currentStage(program.workflow)?.id)
  const [saving, setSaving] = useState(false)
  const statusLabels = { ...stageStatusLabels, ...program.statusLabels }
  const selected = program.workflow.find(stage => stage.id === selectedId) ?? currentStage(program.workflow)
  const done = program.workflow.filter(stage => stage.status === 'done').length
  if (!selected) return <section className="card empty-state">У программы пока нет этапов.</section>

  return <div className="dashboard-grid program-workflow">
    <section className="card workflow-card">
      <div className="card-header"><div><h2>Этапы программы</h2><p>{program.name} · {program.product}</p></div><span className="workflow-count">{done} из {program.workflow.length} выполнено</span></div>
      <div className="workflow-progress"><progress aria-label="Прогресс программы" max={100} value={workflowProgress(program.workflow)} /><strong>{workflowProgress(program.workflow)}%</strong></div>
      <label className="mobile-stage-picker">Выбрать этап<select disabled={saving} value={selected.id} onChange={event => setSelectedId(Number(event.target.value))}>{program.workflow.map(stage => <option key={stage.id} value={stage.id}>{stage.order}. {stage.title} — {statusLabels[stage.status]}</option>)}</select></label>
      <div className="workflow">{program.workflow.map(stage => <button key={stage.id} disabled={saving} aria-pressed={selected.id === stage.id} aria-label={`${stage.order}. ${stage.title}: ${statusLabels[stage.status]}`} className={`stage ${stage.status} ${selected.id === stage.id ? 'selected' : ''}`} onClick={() => setSelectedId(stage.id)}>
        <span className="stage-marker">{stage.status === 'done' ? <Icon name="check" size={16} /> : stage.order}</span>
        <span className="stage-copy"><strong>{stage.shortTitle}</strong><span>{statusLabels[stage.status]}</span></span>
      </button>)}</div>
    </section>
    <StageEditor key={selected.id} stage={selected} statusLabels={statusLabels} onUpload={file => onUpload(selected.id, file)} onDeleteAttachment={attachmentId => onDeleteAttachment(selected.id, attachmentId)} onSave={async update => {
      setSaving(true)
      try { await onSave(selected.id, update) } finally { setSaving(false) }
    }} />
  </div>
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} Б`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} МБ`
}

function StageEditor({ stage, statusLabels, onSave, onUpload, onDeleteAttachment }: {
  stage: WorkflowStage
  statusLabels: Record<WorkflowStage['status'], string>
  onSave: (update: WorkflowStageUpdate) => Promise<void>
  onUpload: (file: File) => Promise<void>
  onDeleteAttachment: (attachmentId: number) => Promise<void>
}) {
  const [draft, setDraft] = useState<WorkflowStageUpdate>({ status: stage.status, owner: stage.owner ?? '', date: stage.date ?? '', note: stage.note ?? '' })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
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
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || uploading) return
    setUploading(true); setMessage(''); setError('')
    try { await onUpload(file); setMessage(`Файл «${file.name}» прикреплён`) }
    catch (error) { setError(error instanceof Error ? error.message : 'Не удалось прикрепить файл') }
    finally { setUploading(false) }
  }
  async function removeAttachment(id: number, name: string) {
    if (!window.confirm(`Удалить вложение «${name}»?`)) return
    setUploading(true); setMessage(''); setError('')
    try { await onDeleteAttachment(id); setMessage('Вложение удалено') }
    catch (error) { setError(error instanceof Error ? error.message : 'Не удалось удалить вложение') }
    finally { setUploading(false) }
  }
  return <section className="card stage-detail">
    <div className="card-header"><div><span className="detail-kicker">ЭТАП {stage.order}</span><h2>{stage.title}</h2></div></div>
    <form className="stage-form" onSubmit={submit}>
      <fieldset disabled={saving}>
        <label>Статус<select value={draft.status} onChange={event => change({ status: event.target.value as WorkflowStage['status'] })}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Ответственный<input maxLength={120} value={draft.owner} onChange={event => change({ owner: event.target.value })} placeholder="Фамилия и инициалы" /></label>
        <label>Дата начала<input type="date" value={draft.date} onChange={event => change({ date: event.target.value })} /></label>
        <label>Комментарий<textarea maxLength={2000} rows={3} value={draft.note} onChange={event => change({ note: event.target.value })} placeholder="Результат этапа или следующий шаг" /></label>
        <button className="primary-button" type="submit">{saving ? 'Сохранение…' : 'Сохранить этап'}</button>
      </fieldset>
      <div className="stage-attachments">
        <div className="stage-attachments-heading"><div><strong>Вложения этапа</strong><span>{stage.attachments?.length ?? 0} файлов</span></div><button type="button" className="stage-upload-button" disabled={uploading} onClick={() => fileInput.current?.click()}><Icon name="plus" size={15} />{uploading ? 'Загрузка…' : 'Прикрепить'}</button></div>
        <input ref={fileInput} className="visually-hidden" type="file" accept=".png,.jpg,.jpeg,.pdf,.zip,.gz,.gzip,.rar,.doc,.docx,.xls,.xlsx" onChange={upload} />
        <p className="attachment-hint">PNG, JPEG, PDF, ZIP, GZIP, RAR, DOC, DOCX, XLS или XLSX · до 25 МБ</p>
        <div className="stage-attachment-list">{stage.attachments?.map(attachment => <article className="stage-attachment" key={attachment.id}><span className="attachment-icon"><Icon name="file" size={17} /></span><div><strong>{attachment.name}</strong><small>{formatFileSize(attachment.size)} · {attachment.uploadedBy}<br />{new Date(attachment.uploadedAt).toLocaleString('ru-RU')}</small></div><a href={attachment.url} download={attachment.name} aria-label={`Скачать ${attachment.name}`}>Скачать</a><button type="button" disabled={uploading} onClick={() => void removeAttachment(attachment.id, attachment.name)} aria-label={`Удалить ${attachment.name}`}>×</button></article>)}{!stage.attachments?.length && <div className="attachment-empty">К этому этапу пока ничего не прикреплено.</div>}</div>
      </div>
      <p className="save-message" role="status">{message}</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <p className="demo-note">Изменения этапов сохраняются на backend.</p>
    </form>
  </section>
}
