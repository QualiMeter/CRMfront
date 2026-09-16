import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Icon } from '../components/Icon'
import type { Program, University, WorkflowTemplate, WorkflowTemplateInput } from '../types/domain'
import '../workflows.css'
import '../workflows-status.css'

const emptyDraft = (): WorkflowTemplateInput => ({ name: '', description: '', stages: [{ title: 'Новый этап', shortTitle: 'Этап' }], statusLabels: { done: 'Выполнено', active: 'В процессе', pending: 'Предстоит', blocked: 'Требует внимания' } })
const toDraft = (template: WorkflowTemplate): WorkflowTemplateInput => ({ name: template.name, description: template.description, stages: template.stages.map(stage => ({ title: stage.title, shortTitle: stage.shortTitle })), statusLabels: { ...template.statusLabels } })

export function WorkflowsPage({ templates, universities, programs, onCreate, onUpdate, onDelete, onApply }: {
  templates: WorkflowTemplate[]
  universities: University[]
  programs: Program[]
  onCreate: (input: WorkflowTemplateInput) => Promise<number>
  onUpdate: (id: number, input: WorkflowTemplateInput) => Promise<void>
  onDelete: (id: number) => Promise<void>
  onApply: (universityId: number, programId: number, templateId: number) => Promise<void>
}) {
  const [selectedId, setSelectedId] = useState<number | 'new'>(templates[0]?.id ?? 'new')
  const [draft, setDraft] = useState<WorkflowTemplateInput>(() => templates[0] ? toDraft(templates[0]) : emptyDraft())
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [applyUniversityId, setApplyUniversityId] = useState<number>(universities[0]?.id ?? 0)
  const availablePrograms = useMemo(() => programs.filter(program => program.universityId === applyUniversityId), [programs, applyUniversityId])
  const [applyProgramId, setApplyProgramId] = useState<number>(availablePrograms[0]?.id ?? 0)
  const [applyTemplateId, setApplyTemplateId] = useState<number>(templates[0]?.id ?? 0)
  const selected = selectedId === 'new' ? null : templates.find(template => template.id === selectedId) ?? null
  const readOnly = selected?.isSystem ?? false

  useEffect(() => {
    if (selectedId === 'new') return
    const template = templates.find(item => item.id === selectedId)
    if (template) setDraft(toDraft(template))
  }, [templates, selectedId])
  useEffect(() => { const first = programs.find(program => program.universityId === applyUniversityId); setApplyProgramId(first?.id ?? 0) }, [applyUniversityId, programs])
  useEffect(() => { if (!templates.some(item => item.id === applyTemplateId)) setApplyTemplateId(templates[0]?.id ?? 0) }, [templates, applyTemplateId])

  function choose(template: WorkflowTemplate) { setSelectedId(template.id); setDraft(toDraft(template)); setMessage(''); setError('') }
  function createNew() { setSelectedId('new'); setDraft(emptyDraft()); setMessage(''); setError('') }
  function updateStage(index: number, update: Partial<WorkflowTemplateInput['stages'][number]>) { setDraft(current => ({ ...current, stages: current.stages.map((stage, stageIndex) => stageIndex === index ? { ...stage, ...update } : stage) })); setMessage('') }
  function moveStage(index: number, direction: -1 | 1) { setDraft(current => { const next = [...current.stages]; const target = index + direction; if (target < 0 || target >= next.length) return current; [next[index], next[target]] = [next[target], next[index]]; return { ...current, stages: next } }) }
  function removeStage(index: number) { if (draft.stages.length === 1) return setError('В процессе должен остаться хотя бы один этап.'); setDraft(current => ({ ...current, stages: current.stages.filter((_, stageIndex) => stageIndex !== index) })) }

  async function save(event: FormEvent) {
    event.preventDefault(); if (saving || readOnly) return
    setSaving(true); setMessage(''); setError('')
    try {
      if (selectedId === 'new') { const id = await onCreate(draft); setSelectedId(id); setMessage('Шаблон создан') }
      else { await onUpdate(selectedId, draft); setMessage('Шаблон сохранён') }
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось сохранить шаблон') }
    finally { setSaving(false) }
  }
  async function duplicate() {
    if (!selected) return
    setSaving(true); setError(''); setMessage('')
    try { const id = await onCreate({ ...toDraft(selected), name: `Копия — ${selected.name}` }); setSelectedId(id); setMessage('Создана редактируемая копия') }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось создать копию') }
    finally { setSaving(false) }
  }
  async function removeTemplate() {
    if (!selected || selected.isSystem || !window.confirm(`Удалить шаблон «${selected.name}»?`)) return
    setSaving(true); setError(''); setMessage('')
    try { await onDelete(selected.id); const fallback = templates.find(item => item.id !== selected.id); if (fallback) { setSelectedId(fallback.id); setDraft(toDraft(fallback)) } else createNew(); setMessage('Шаблон удалён') }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось удалить шаблон') }
    finally { setSaving(false) }
  }
  async function applyTemplate() {
    const template = templates.find(item => item.id === applyTemplateId)
    const program = programs.find(item => item.id === applyProgramId && item.universityId === applyUniversityId)
    if (!template || !program) return setError('Выберите вуз, программу и шаблон.')
    if (!window.confirm(`Применить «${template.name}» к программе «${program.name}»? Текущие этапы, комментарии и вложения программы будут заменены.`)) return
    setSaving(true); setError(''); setMessage('')
    try { await onApply(applyUniversityId, applyProgramId, applyTemplateId); setMessage(`Шаблон применён к программе «${program.name}».`) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось применить шаблон') }
    finally { setSaving(false) }
  }

  return <div className="content workflows-workspace">
    <div className="page-heading"><div><div className="eyebrow">КОНСТРУКТОР WORKFLOW</div><h1>Бизнес-процессы</h1><p className="muted">Создавайте последовательности этапов и назначайте их образовательным программам</p></div><button className="primary-button" onClick={createNew}><Icon name="plus" size={17} /> Новый шаблон</button></div>
    <div className="workflows-layout">
      <aside className="card workflow-templates"><div className="card-header"><div><h2>Шаблоны</h2><p>{templates.length} процессов</p></div></div><div className="workflow-template-list">{templates.map(template => <button key={template.id} className={selectedId === template.id ? 'active' : ''} onClick={() => choose(template)}><span>{template.isSystem ? 'Системный' : 'Пользовательский'}</span><strong>{template.name}</strong><small>{template.stages.length} этапов · обновлён {new Date(template.updatedAt).toLocaleDateString('ru-RU')}</small></button>)}</div></aside>
      <form className="card workflow-builder" onSubmit={save}><div className="card-header"><div><h2>{selectedId === 'new' ? 'Новый шаблон' : selected?.name}</h2><p>{readOnly ? 'Системный шаблон защищён от изменений' : 'Настройте название и порядок этапов'}</p></div><div className="workflow-builder-actions">{selected && <button type="button" className="ghost-button" disabled={saving} onClick={() => void duplicate()}>Создать копию</button>}{selected && !selected.isSystem && <button type="button" className="workflow-delete-button" disabled={saving} onClick={() => void removeTemplate()}>Удалить</button>}</div></div><fieldset disabled={saving || readOnly} className="workflow-builder-fields"><label>Название<input maxLength={120} value={draft.name} onChange={event => setDraft(current => ({ ...current, name: event.target.value }))} placeholder="Например, внедрение продукта" /></label><label>Описание<textarea maxLength={500} rows={2} value={draft.description} onChange={event => setDraft(current => ({ ...current, description: event.target.value }))} placeholder="Когда следует использовать этот процесс" /></label><div className="workflow-status-section"><div><strong>Названия статусов</strong><span>Они будут отображаться в карточке программы</span></div><div className="workflow-status-grid">{([['done','Выполнено'],['active','В процессе'],['pending','Предстоит'],['blocked','Требует внимания']] as const).map(([key, label]) => <label key={key}>{label}<input maxLength={40} value={draft.statusLabels[key]} onChange={event => setDraft(current => ({ ...current, statusLabels: { ...current.statusLabels, [key]: event.target.value } }))} /></label>)}</div></div><div className="workflow-stage-heading"><div><strong>Этапы процесса</strong><span>От 1 до 30 этапов</span></div>{!readOnly && <button type="button" onClick={() => setDraft(current => ({ ...current, stages: [...current.stages, { title: '', shortTitle: '' }] }))}><Icon name="plus" size={15} /> Добавить этап</button>}</div><div className="workflow-stage-editor">{draft.stages.map((stage, index) => <article key={index}><span className="workflow-stage-number">{index + 1}</span><label>Полное название<input maxLength={160} value={stage.title} onChange={event => updateStage(index, { title: event.target.value })} /></label><label>Короткое название<input maxLength={50} value={stage.shortTitle} onChange={event => updateStage(index, { shortTitle: event.target.value })} /></label>{!readOnly && <div className="workflow-stage-actions"><button type="button" disabled={index === 0} onClick={() => moveStage(index, -1)} aria-label="Переместить вверх">↑</button><button type="button" disabled={index === draft.stages.length - 1} onClick={() => moveStage(index, 1)} aria-label="Переместить вниз">↓</button><button type="button" onClick={() => removeStage(index)} aria-label="Удалить этап">×</button></div>}</article>)}</div>{!readOnly && <button className="primary-button workflow-save-button" type="submit">{saving ? 'Сохранение…' : selectedId === 'new' ? 'Создать шаблон' : 'Сохранить изменения'}</button>}</fieldset></form>
    </div>
    <section className="card workflow-apply-card"><div className="card-header"><div><h2>Применить процесс к программе</h2><p>Текущие этапы программы будут заменены выбранным шаблоном</p></div></div><div className="workflow-apply-form"><label>Вуз<select value={applyUniversityId} onChange={event => setApplyUniversityId(Number(event.target.value))}>{universities.map(item => <option key={item.id} value={item.id}>{item.shortName} · {item.city}</option>)}</select></label><label>Программа<select value={applyProgramId} onChange={event => setApplyProgramId(Number(event.target.value))}>{availablePrograms.map(item => <option key={item.id} value={item.id}>{item.name} · {item.product}</option>)}</select></label><label>Шаблон<select value={applyTemplateId} onChange={event => setApplyTemplateId(Number(event.target.value))}>{templates.map(item => <option key={item.id} value={item.id}>{item.name} ({item.stages.length})</option>)}</select></label><button className="primary-button" disabled={saving || !applyProgramId || !applyTemplateId} onClick={() => void applyTemplate()}>Применить</button></div></section>
    {message && <p className="workflow-feedback success" role="status">{message}</p>}{error && <p className="workflow-feedback error" role="alert">{error}</p>}<p className="demo-note">Демо: пользовательские шаблоны и назначения сохраняются до перезагрузки страницы.</p>
  </div>
}
