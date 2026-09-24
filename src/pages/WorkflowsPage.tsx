import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Icon } from '../components/Icon'
import type { Program, University, WorkflowTemplate, WorkflowTemplateInput } from '../types/domain'
import '../workflows.css'
import '../workflows-status.css'

const emptyDraft = (): WorkflowTemplateInput => ({ name: '', description: '', stages: [{ title: 'Новый этап', shortTitle: 'Этап' }], branches: [], statusLabels: { done: 'Выполнено', active: 'В процессе', pending: 'Предстоит', blocked: 'Требует внимания' } })
const toDraft = (template: WorkflowTemplate): WorkflowTemplateInput => ({ name: template.name, description: template.description, stages: template.stages.map(stage => ({ title: stage.title, shortTitle: stage.shortTitle })), branches: template.branches.map(branch => ({ ...branch })), statusLabels: { ...template.statusLabels } })

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
  function moveStage(index: number, direction: -1 | 1) {
    setDraft(current => {
      const target = index + direction
      if (target < 0 || target >= current.stages.length) return current
      const next = [...current.stages]
      ;[next[index], next[target]] = [next[target], next[index]]
      const fromOrder = index + 1
      const targetOrder = target + 1
      const remap = (order: number) => order === fromOrder ? targetOrder : order === targetOrder ? fromOrder : order
      return { ...current, stages: next, branches: current.branches.map(branch => ({ ...branch, fromOrder: remap(branch.fromOrder), toOrder: remap(branch.toOrder) })) }
    })
  }
  function removeStage(index: number) {
    if (draft.stages.length === 1) return setError('В процессе должен остаться хотя бы один этап.')
    const removedOrder = index + 1
    setDraft(current => ({
      ...current,
      stages: current.stages.filter((_, stageIndex) => stageIndex !== index),
      branches: current.branches
        .filter(branch => branch.fromOrder !== removedOrder && branch.toOrder !== removedOrder)
        .map(branch => ({ ...branch, fromOrder: branch.fromOrder > removedOrder ? branch.fromOrder - 1 : branch.fromOrder, toOrder: branch.toOrder > removedOrder ? branch.toOrder - 1 : branch.toOrder })),
    }))
  }
  function addBranch() {
    if (draft.stages.length < 2) return setError('Для ветвления нужно минимум два этапа.')
    setDraft(current => ({ ...current, branches: [...current.branches, { fromOrder: 1, toOrder: Math.min(2, current.stages.length), label: '' }] }))
    setError('')
  }
  function updateBranch(index: number, update: Partial<WorkflowTemplateInput['branches'][number]>) {
    setDraft(current => ({ ...current, branches: current.branches.map((branch, branchIndex) => branchIndex === index ? { ...branch, ...update } : branch) }))
    setMessage('')
  }
  function removeBranch(index: number) {
    setDraft(current => ({ ...current, branches: current.branches.filter((_, branchIndex) => branchIndex !== index) }))
  }

  async function save(event: FormEvent) {
    event.preventDefault(); if (saving || readOnly) return
    setSaving(true); setMessage(''); setError('')
    try {
      const invalidBranch = draft.branches.find(branch => !branch.label.trim() || branch.fromOrder === branch.toOrder || branch.fromOrder < 1 || branch.toOrder < 1 || branch.fromOrder > draft.stages.length || branch.toOrder > draft.stages.length)
      if (invalidBranch) throw new Error('Проверьте ветвления: условие должно быть заполнено, а исходный и целевой этапы — различаться.')
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
      <form className="card workflow-builder" onSubmit={save}><div className="card-header"><div><h2>{selectedId === 'new' ? 'Новый шаблон' : selected?.name}</h2><p>{readOnly ? 'Системный шаблон защищён от изменений' : 'Настройте название и порядок этапов'}</p></div><div className="workflow-builder-actions">{selected && <button type="button" className="ghost-button" disabled={saving} onClick={() => void duplicate()}>Создать копию</button>}{selected && !selected.isSystem && <button type="button" className="workflow-delete-button" disabled={saving} onClick={() => void removeTemplate()}>Удалить</button>}</div></div><fieldset disabled={saving || readOnly} className="workflow-builder-fields"><label>Название<input maxLength={120} value={draft.name} onChange={event => setDraft(current => ({ ...current, name: event.target.value }))} placeholder="Например, внедрение продукта" /></label><label>Описание<textarea maxLength={500} rows={2} value={draft.description} onChange={event => setDraft(current => ({ ...current, description: event.target.value }))} placeholder="Когда следует использовать этот процесс" /></label><div className="workflow-status-section"><div><strong>Названия статусов</strong><span>Они будут отображаться в карточке программы</span></div><div className="workflow-status-grid">{([['done','Выполнено'],['active','В процессе'],['pending','Предстоит'],['blocked','Требует внимания']] as const).map(([key, label]) => <label key={key}>{label}<input maxLength={40} value={draft.statusLabels[key]} onChange={event => setDraft(current => ({ ...current, statusLabels: { ...current.statusLabels, [key]: event.target.value } }))} /></label>)}</div></div><div className="workflow-stage-heading"><div><strong>Этапы процесса</strong><span>От 1 до 30 этапов</span></div>{!readOnly && <button type="button" onClick={() => setDraft(current => ({ ...current, stages: [...current.stages, { title: '', shortTitle: '' }] }))}><Icon name="plus" size={15} /> Добавить этап</button>}</div><div className="workflow-stage-editor">{draft.stages.map((stage, index) => <article key={index}><span className="workflow-stage-number">{index + 1}</span><label>Полное название<input maxLength={160} value={stage.title} onChange={event => updateStage(index, { title: event.target.value })} /></label><label>Короткое название<input maxLength={50} value={stage.shortTitle} onChange={event => updateStage(index, { shortTitle: event.target.value })} /></label>{!readOnly && <div className="workflow-stage-actions"><button type="button" disabled={index === 0} onClick={() => moveStage(index, -1)} aria-label="Переместить вверх">↑</button><button type="button" disabled={index === draft.stages.length - 1} onClick={() => moveStage(index, 1)} aria-label="Переместить вниз">↓</button><button type="button" onClick={() => removeStage(index)} aria-label="Удалить этап">×</button></div>}</article>)}</div><section className="workflow-branch-section"><div className="workflow-stage-heading"><div><strong>Ветвления процесса</strong><span>Подготовка маршрутов: условие определяет переход на другой этап</span></div>{!readOnly && <button type="button" onClick={addBranch}><Icon name="plus" size={15} /> Добавить маршрут</button>}</div><div className="workflow-branch-list">{draft.branches.map((branch, index) => <article key={index}><label>Из этапа<select value={branch.fromOrder} onChange={event => updateBranch(index, { fromOrder: Number(event.target.value) })}>{draft.stages.map((stage, stageIndex) => <option key={stageIndex} value={stageIndex + 1}>{stageIndex + 1}. {stage.shortTitle || stage.title || 'Этап'}</option>)}</select></label><label>Условие / вариант<input maxLength={120} value={branch.label} onChange={event => updateBranch(index, { label: event.target.value })} placeholder="Например, договор согласован" /></label><label>Перейти на<select value={branch.toOrder} onChange={event => updateBranch(index, { toOrder: Number(event.target.value) })}>{draft.stages.map((stage, stageIndex) => <option key={stageIndex} value={stageIndex + 1}>{stageIndex + 1}. {stage.shortTitle || stage.title || 'Этап'}</option>)}</select></label>{!readOnly && <button type="button" className="workflow-branch-remove" onClick={() => removeBranch(index)} aria-label="Удалить маршрут">×</button>}</article>)}{!draft.branches.length && <p className="workflow-branch-empty">Дополнительных маршрутов нет — процесс идёт по обычной последовательности этапов.</p>}</div><p className="demo-note">Маршруты сохраняются вместе с шаблоном. Выполнение ветки будет подключено к backend transition API после его появления.</p></section>{!readOnly && <button className="primary-button workflow-save-button" type="submit">{saving ? 'Сохранение…' : selectedId === 'new' ? 'Создать шаблон' : 'Сохранить изменения'}</button>}</fieldset></form>
    </div>
    <section className="card workflow-apply-card"><div className="card-header"><div><h2>Запуск процесса для нового взаимодействия</h2><p>По требованиям заказчика изменение шаблона не должно перезаписывать уже идущий workflow. Поэтому старое действие «заменить этапы» отключено до подключения workflow instances на backend.</p></div></div><div className="workflow-apply-form"><label>Вуз<select value={applyUniversityId} onChange={event => setApplyUniversityId(Number(event.target.value))}>{universities.map(item => <option key={item.id} value={item.id}>{item.shortName} · {item.city}</option>)}</select></label><label>Программа<select value={applyProgramId} onChange={event => setApplyProgramId(Number(event.target.value))}>{availablePrograms.map(item => <option key={item.id} value={item.id}>{item.name} · {item.product}</option>)}</select></label><label>Шаблон<select value={applyTemplateId} onChange={event => setApplyTemplateId(Number(event.target.value))}>{templates.map(item => <option key={item.id} value={item.id}>{item.name} ({item.stages.length})</option>)}</select></label><button className="primary-button" disabled title="Будет подключено к новому API workflow instances">Запустить новое взаимодействие</button></div></section>
    {message && <p className="workflow-feedback success" role="status">{message}</p>}{error && <p className="workflow-feedback error" role="alert">{error}</p>}<p className="demo-note">Редактирование шаблонов сохраняется на backend. Запуск нового workflow будет подключён к отдельному interaction/workflow instance, чтобы не уничтожать историю действующих процессов.</p>
  </div>
}
