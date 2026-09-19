import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { CrmTask, Program, TaskInput, TaskUpdate, University } from '../types/domain'

const priorities = { low: 'Низкий', normal: 'Обычный', high: 'Высокий' }
function today() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
export const isOverdue = (task: CrmTask) => task.status === 'open' && task.dueDate < today()
const displayDate = (value: string) => value.split('-').reverse().join('.')

export interface TasksPanelProps {
  tasks: CrmTask[]
  universities: University[]
  programs: Program[]
  universityId?: number
  initialProgramId?: number
  onCreate: (input: TaskInput) => Promise<void>
  onUpdate: (id: number, update: TaskUpdate) => Promise<void>
  onOpenUniversity?: (id: number, programId?: number) => void
}

export function TasksPanel(props: TasksPanelProps & { createSignal?: number }) {
  const { tasks, universities, programs, universityId, onCreate, onUpdate, onOpenUniversity } = props
  const [filter, setFilter] = useState('open')
  const [query, setQuery] = useState('')
  const [editor, setEditor] = useState<CrmTask | 'new' | null>(null)
  const [busy, setBusy] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  useEffect(() => { if (props.createSignal) setEditor('new') }, [props.createSignal])
  const scoped = tasks.filter(task => universityId === undefined || task.universityId === universityId)
  const counts = { open: scoped.filter(task => task.status === 'open').length, done: scoped.filter(task => task.status === 'done').length, overdue: scoped.filter(isOverdue).length }
  const filtered = scoped.filter(task => (filter === 'all' || filter === 'overdue' ? filter === 'all' || isOverdue(task) : task.status === filter) && `${task.title} ${task.owner} ${programs.find(program => program.id === task.programId)?.name ?? ''}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => Number(a.status === 'done') - Number(b.status === 'done') || a.dueDate.localeCompare(b.dueDate))
  async function toggle(task: CrmTask) {
    setBusy(task.id); setError(''); setMessage('')
    try { await onUpdate(task.id, { status: task.status === 'done' ? 'open' : 'done' }); setMessage(task.status === 'done' ? 'Задача возвращена в работу' : 'Задача выполнена') }
    catch (error) { setError(error instanceof Error ? error.message : 'Не удалось изменить задачу') }
    finally { setBusy(null) }
  }
  return <section className="card crm-tasks" aria-label={universityId ? 'Задачи вуза' : 'Все задачи'}>
    <div className="card-header"><div><h2>{universityId ? 'Задачи вуза' : 'Все задачи'}</h2><p>{counts.open} в работе · {counts.overdue} просрочено · {counts.done} выполнено</p></div><button className="primary-button" onClick={() => setEditor('new')}>Добавить задачу</button></div>
    <div className="crm-task-toolbar"><label>Показать<select value={filter} onChange={event => setFilter(event.target.value)}><option value="open">В работе ({counts.open})</option><option value="overdue">Просроченные ({counts.overdue})</option><option value="done">Выполненные ({counts.done})</option><option value="all">Все ({scoped.length})</option></select></label><label>Поиск<input value={query} onChange={event => setQuery(event.target.value)} placeholder="Задача, ответственный, программа" /></label></div>
    {message && <p className="crm-task-feedback" role="status">{message}</p>}{error && <p className="form-error crm-task-feedback" role="alert">{error}</p>}
    <div className="crm-task-list">{filtered.map(task => <article className={`crm-task-item ${task.status === 'done' ? 'completed' : ''}`} key={task.id}>
      <div className="crm-task-copy"><h3>{task.title}</h3><p>{programs.find(program => program.id === task.programId)?.name ?? 'Общая задача вуза'}</p>{onOpenUniversity && <button className="program-link" onClick={() => onOpenUniversity(task.universityId, task.programId)}>{universities.find(university => university.id === task.universityId)?.shortName ?? 'Открыть вуз'}</button>}
      {task.description && <p className="crm-task-description">{task.description}</p>}
      <div className="crm-task-meta"><span>Ответственный: {task.owner}</span><span className={isOverdue(task) ? 'overdue' : ''}>{isOverdue(task) ? 'Просрочено · ' : 'Срок: '}{displayDate(task.dueDate)}</span><span className={`priority-${task.priority}`}>Приоритет: {priorities[task.priority]}</span><span>{task.status === 'done' ? 'Выполнено' : 'В работе'}</span></div></div>
      <div className="crm-task-actions"><button disabled={busy !== null} className="task-action" onClick={() => setEditor(task)}>Изменить</button><button disabled={busy !== null} className="task-action task-complete" onClick={() => void toggle(task)}>{busy === task.id ? 'Сохранение…' : task.status === 'done' ? 'Вернуть в работу' : 'Завершить'}</button></div>
    </article>)}{!filtered.length && <p className="empty-state">{scoped.length ? 'Задач по выбранным условиям нет.' : 'Задач пока нет. Добавьте первое поручение.'}</p>}</div>
    <p className="demo-note crm-task-feedback">Задачи и изменения сохраняются на backend.</p>
    {editor && <TaskEditor key={editor === 'new' ? 'new' : editor.id} task={editor === 'new' ? undefined : editor} universities={universities} programs={programs} universityId={universityId} initialProgramId={props.initialProgramId} onClose={() => setEditor(null)} onSave={async input => {
      if (editor === 'new') await onCreate(input)
      else { const { universityId: ignored, ...update } = input; await onUpdate(editor.id, update) }
      setMessage(editor === 'new' ? 'Задача создана' : 'Задача обновлена'); setError(''); setFilter('all'); setQuery(''); setEditor(null)
    }} />}
  </section>
}

function TaskEditor({ task, universities, programs, universityId, initialProgramId, onClose, onSave }: {
  task?: CrmTask; universities: University[]; programs: Program[]; universityId?: number; initialProgramId?: number; onClose: () => void; onSave: (input: TaskInput) => Promise<void>
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [draft, setDraft] = useState<TaskInput>(task ?? { universityId: universityId ?? universities[0]?.id ?? 0, programId: initialProgramId, title: '', owner: '', dueDate: '', priority: 'normal', description: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close() }, [])
  const update = (patch: Partial<TaskInput>) => setDraft(current => ({ ...current, ...patch }))
  async function submit(event: FormEvent) {
    event.preventDefault(); if (saving) return
    if (!draft.title.trim() || !draft.owner.trim()) { setError('Заполните название и ответственного'); return }
    setSaving(true); setError('')
    try { await onSave(draft) } catch (error) { setError(error instanceof Error ? error.message : 'Не удалось сохранить задачу') } finally { setSaving(false) }
  }
  return <dialog ref={dialog} className="task-dialog" aria-labelledby="task-dialog-title" onCancel={event => { event.preventDefault(); if (!saving) onClose() }}>
    <div className="card-header"><h2 id="task-dialog-title">{task ? 'Редактирование задачи' : 'Новая задача'}</h2><button className="task-dialog-close" disabled={saving} aria-label="Закрыть форму" onClick={onClose}>×</button></div>
    <form className="stage-form" onSubmit={submit}><fieldset disabled={saving}>
      <label>Название задачи<input autoFocus required maxLength={160} value={draft.title} onChange={event => update({ title: event.target.value })} /></label>
      <div className="task-form-grid"><label>Учебное заведение<select required disabled={universityId !== undefined || !!task} value={draft.universityId} onChange={event => update({ universityId: Number(event.target.value), programId: undefined })}>{universities.map(university => <option key={university.id} value={university.id}>{university.shortName} · {university.city}</option>)}</select></label>
      <label>Программа<select value={draft.programId ?? ''} onChange={event => update({ programId: event.target.value ? Number(event.target.value) : undefined })}><option value="">Общая задача вуза</option>{programs.filter(program => program.universityId === draft.universityId).map(program => <option key={program.id} value={program.id}>{program.name}</option>)}</select></label></div>
      <label>Ответственный<input required maxLength={120} value={draft.owner} onChange={event => update({ owner: event.target.value })} placeholder="Фамилия и инициалы" /></label>
      <div className="task-form-grid"><label>Срок<input required type="date" value={draft.dueDate} onChange={event => update({ dueDate: event.target.value })} /></label><label>Приоритет<select value={draft.priority} onChange={event => update({ priority: event.target.value as TaskInput['priority'] })}>{Object.entries(priorities).map(([value, title]) => <option key={value} value={value}>{title}</option>)}</select></label></div>
      <label>Описание<textarea rows={3} maxLength={2000} value={draft.description} onChange={event => update({ description: event.target.value })} /></label>
      {error && <p role="alert" className="form-error">{error}</p>}
      <div className="crm-task-actions"><button type="button" className="task-action" onClick={onClose}>Отмена</button><button className="primary-button" type="submit">{saving ? 'Сохранение…' : task ? 'Сохранить' : 'Создать задачу'}</button></div>
    </fieldset></form>
  </dialog>
}
