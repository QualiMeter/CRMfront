import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type { University, UniversityInput } from '../types/domain'
import { Icon } from '../components/Icon'

const blankUniversity: UniversityInput = { name: '', shortName: '', city: '', contactPerson: '', contactRole: '', status: 'Контакт найден' }

export function UniversitiesPage({ universities, onOpen, onCreate, initialQuery = '' }: { universities: University[]; onOpen: (id: number) => void; onCreate: (input: UniversityInput) => Promise<number>; initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery)
  useEffect(() => setQuery(initialQuery), [initialQuery])
  const [status, setStatus] = useState('')
  const [editorOpen, setEditorOpen] = useState(false)
  const [draft, setDraft] = useState<UniversityInput>(blankUniversity)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const statuses = [...new Set(universities.map(university => university.status))]
  const filtered = useMemo(() => universities.filter((u) => (!status || u.status === status) && `${u.name} ${u.city} ${u.shortName}`.toLowerCase().includes(query.toLowerCase())), [universities, query, status])
  async function submit(event: FormEvent) {
    event.preventDefault(); if (saving) return
    setSaving(true); setError('')
    try { const id = await onCreate(draft); setEditorOpen(false); setDraft(blankUniversity); onOpen(id) }
    catch (error) { setError(error instanceof Error ? error.message : 'Не удалось добавить вуз') }
    finally { setSaving(false) }
  }

  return <div className="content">
    <div className="page-heading">
      <div><div className="eyebrow">УПРАВЛЕНИЕ УЧЕБНЫМИ ЗАВЕДЕНИЯМИ</div><h1>Вузы</h1><p className="muted">Контроль текущих взаимодействий и образовательных программ</p></div>
      <button className="primary-button" onClick={() => setEditorOpen(true)}><Icon name="plus" size={18} /> Добавить вуз</button>
    </div>

    <section className="card universities-toolbar"><div className="list-search"><Icon name="search" size={17} /><input aria-label="Поиск учебного заведения" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск по названию, городу или аббревиатуре" /></div><select className="toolbar-filter" aria-label="Статус взаимодействия" value={status} onChange={event => setStatus(event.target.value)}><option value="">Все статусы</option>{statuses.map(value => <option key={value} value={value}>{value}</option>)}</select></section>

    <section className="card universities-list"><div className="list-header"><div><h2>Учебные заведения</h2><p>{filtered.length} из {universities.length}</p></div></div>{filtered.map((university) => <button className="university-row university-desktop-row" key={university.id} onClick={() => onOpen(university.id)}><div className="university-logo">{university.shortName.slice(0, 2)}</div><div className="university-main"><strong>{university.name}</strong><span>{university.shortName} · {university.city}</span></div><div className="university-stat"><span>Программы</span><strong>{university.programsCount}</strong></div><div className="university-stat"><span>Обучающиеся</span><strong>{university.students.toLocaleString('ru-RU')}</strong></div><div className="university-progress"><span>Прогресс</span><div><i style={{ width: `${university.progress}%` }} /></div><strong>{university.progress}%</strong></div><span className="university-status"><i />{university.status}</span><Icon name="arrow" size={17} /></button>)}
      <div className="university-mobile-list">{filtered.map(university => <article className="university-mobile-card" key={university.id}><div className="university-card-heading"><span className="university-logo" aria-hidden="true">{university.shortName.slice(0, 2)}</span><div><h2><button className="university-open" onClick={() => onOpen(university.id)}>{university.name}</button></h2><p>{university.shortName} · {university.city}</p></div></div><span className="university-status"><i />{university.status}</span><dl className="university-card-metrics"><div><dt>Программы</dt><dd>{university.programsCount}</dd></div><div><dt>Обучающиеся</dt><dd>{university.students.toLocaleString('ru-RU')}</dd></div></dl><div className="university-card-progress"><label htmlFor={`university-progress-${university.id}`}>Прогресс взаимодействия <strong>{university.progress}%</strong></label><progress id={`university-progress-${university.id}`} max={100} value={university.progress} /></div><button className="university-open-button" onClick={() => onOpen(university.id)}>Открыть карточку <Icon name="arrow" size={18} /></button></article>)}</div>{filtered.length === 0 && <div className="empty-state">По вашему запросу ничего не найдено.</div>}</section>

    {editorOpen && <div className="crm-overlay" onMouseDown={event => { if (event.target === event.currentTarget && !saving) setEditorOpen(false) }}><section className="crm-modal" role="dialog" aria-modal="true" aria-labelledby="university-editor-title"><div className="modal-heading"><div><div className="eyebrow">НОВАЯ КАРТОЧКА</div><h2 id="university-editor-title">Добавить вуз</h2></div><button className="modal-close" disabled={saving} aria-label="Закрыть" onClick={() => setEditorOpen(false)}>×</button></div><form className="modal-form" onSubmit={submit}><fieldset disabled={saving}><label>Полное название<input autoFocus required maxLength={300} value={draft.name} onChange={event => setDraft(current => ({ ...current, name: event.target.value }))} /></label><div className="modal-form-grid"><label>Аббревиатура<input required maxLength={30} value={draft.shortName} onChange={event => setDraft(current => ({ ...current, shortName: event.target.value }))} /></label><label>Город<input required maxLength={100} value={draft.city} onChange={event => setDraft(current => ({ ...current, city: event.target.value }))} /></label></div><label>Контактное лицо<input required maxLength={160} value={draft.contactPerson} onChange={event => setDraft(current => ({ ...current, contactPerson: event.target.value }))} /></label><label>Должность<input required maxLength={160} value={draft.contactRole} onChange={event => setDraft(current => ({ ...current, contactRole: event.target.value }))} /></label><label>Статус<select value={draft.status} onChange={event => setDraft(current => ({ ...current, status: event.target.value }))}><option>Контакт найден</option><option>Коммуникация</option><option>Внедрение</option><option>Активное взаимодействие</option></select></label>{error && <p className="form-error" role="alert">{error}</p>}<div className="modal-actions"><button type="button" className="task-action" onClick={() => setEditorOpen(false)}>Отмена</button><button className="primary-button" type="submit">{saving ? 'Добавление…' : 'Добавить вуз'}</button></div></fieldset></form></section></div>}
  </div>
}
