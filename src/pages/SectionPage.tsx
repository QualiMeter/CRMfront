import { ProgramList } from '../components/ProgramList'
import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Icon } from '../components/Icon'
import type { Activity, Program, ProgramInput, University } from '../types/domain'

type Section = 'programs' | 'analytics' | 'tasks' | 'documents'
type DemoDocument = { id: number; name: string; status: 'Готов' | 'На согласовании'; updated: string; size: string }
const sectionMeta: Record<Section, { eyebrow: string; title: string; description: string }> = {
  programs: { eyebrow: 'КАТАЛОГ ОБРАЗОВАТЕЛЬНЫХ ПРОГРАММ', title: 'Программы', description: 'Единый список программ, продуктов и показателей востребованности' },
  analytics: { eyebrow: 'АНАЛИТИКА И РЕЙТИНГ', title: 'Аналитика', description: 'Сводные показатели подготовки ИТ-кадров и востребованности программ' },
  tasks: { eyebrow: 'РАБОЧИЙ ЦЕНТР', title: 'Задачи', description: 'Контроль поручений и этапов взаимодействия с учебными заведениями' },
  documents: { eyebrow: 'ДОКУМЕНТООБОРОТ', title: 'Документы', description: 'Пакет документов по договорам, программам и внедрению продуктов' },
}
const initialDocuments: DemoDocument[] = ['Договор о сотрудничестве.pdf','Учебная программа — DevOps.docx','Лицензия ИТ-продукта.pdf','Методические материалы.zip','Протокол встречи.pdf'].map((name, i) => ({ id: i + 1, name, status: i === 1 ? 'На согласовании' : 'Готов', updated: i % 2 ? 'Изменён вчера' : 'Загружен сегодня', size: ['1,8 МБ','740 КБ','2,1 МБ','18,4 МБ','620 КБ'][i] }))

export function SectionPage({ section, programs, activities, universities, onOpenUniversity, onCreateProgram }: { section: Section; programs: Program[]; activities: Activity[]; universities: University[]; onOpenUniversity: (id: number, programId?: number) => void; onCreateProgram: (input: ProgramInput) => Promise<void> }) {
  const meta = sectionMeta[section]
  const [query, setQuery] = useState('')
  const [programEditor, setProgramEditor] = useState(false)
  const [programError, setProgramError] = useState('')
  const [savingProgram, setSavingProgram] = useState(false)
  const [draft, setDraft] = useState<ProgramInput>({ universityId: universities[0]?.id ?? 0, name: '', product: '', students: 0, streams: 0, applications: 0, demand: 50 })
  const [documents, setDocuments] = useState(initialDocuments)
  const [selectedDocument, setSelectedDocument] = useState<DemoDocument | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const filteredPrograms = useMemo(() => programs.filter((p) => `${p.name} ${p.product} ${p.stage}`.toLowerCase().includes(query.toLowerCase())), [programs, query])
  const totals = useMemo(() => ({ applications: programs.reduce((sum, p) => sum + p.applications, 0), students: programs.reduce((sum, p) => sum + p.students, 0), streams: programs.reduce((sum, p) => sum + p.streams, 0) }), [programs])

  async function createProgram(event: FormEvent) {
    event.preventDefault(); if (savingProgram) return
    setSavingProgram(true); setProgramError('')
    try { await onCreateProgram(draft); setProgramEditor(false); setDraft(current => ({ ...current, name: '', product: '', students: 0, streams: 0, applications: 0, demand: 50 })) }
    catch (error) { setProgramError(error instanceof Error ? error.message : 'Не удалось добавить программу') }
    finally { setSavingProgram(false) }
  }
  function uploadDocument(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setDocuments(current => [{ id: Date.now(), name: file.name, status: 'На согласовании', updated: 'Загружен только что', size: file.size ? `${Math.max(1, Math.round(file.size / 1024))} КБ` : '—' }, ...current])
    event.target.value = ''
  }

  return <div className="content">
    <div className="page-heading"><div><div className="eyebrow">{meta.eyebrow}</div><h1>{meta.title}</h1><p className="muted">{meta.description}</p></div>{section === 'programs' && <button className="primary-button" onClick={() => setProgramEditor(true)}><Icon name="plus" size={18} /> Добавить программу</button>}{section === 'documents' && <><button className="primary-button" onClick={() => fileInput.current?.click()}><Icon name="plus" size={18} /> Загрузить документ</button><input ref={fileInput} className="visually-hidden" type="file" onChange={uploadDocument} /></>}</div>

    {section === 'programs' && <section className="card universities-list"><div className="list-header section-toolbar"><div><h2>Все программы</h2><p>{filteredPrograms.length} программ в демо</p></div><div className="list-search compact-search"><Icon name="search" size={17}/><input aria-label="Поиск программы или продукта" value={query} onChange={e => setQuery(e.target.value)} placeholder="Поиск программы или продукта"/></div></div><ProgramList programs={filteredPrograms} onSelect={program => onOpenUniversity(program.universityId, program.id)} /></section>}

    {section === 'analytics' && <div className="analytics-grid"><Metric title="Заявки на обучение" value={totals.applications.toLocaleString('ru-RU')} delta={`${programs.length} программ`} detail="в текущей выборке"/><Metric title="Обучающиеся" value={totals.students.toLocaleString('ru-RU')} delta={`${universities.length} вузов`} detail="по активным карточкам"/><Metric title="Активные потоки" value={totals.streams.toLocaleString('ru-RU')} delta={`${Math.round(programs.reduce((sum,p)=>sum+p.demand,0)/Math.max(1,programs.length))}%`} detail="средний индекс спроса"/><section className="card chart-card"><div className="card-header"><div><h2>Востребованность направлений</h2><p>Индекс на основе заявок, обучающихся и потоков</p></div></div>{[...programs].sort((a,b)=>b.demand-a.demand).slice(0,5).map(p => <button className="rank-row rank-row-button" key={p.id} onClick={() => onOpenUniversity(p.universityId, p.id)}><div><strong>{p.name}</strong><span>{p.product}</span></div><div className="rank-value"><div className="demand-bar"><span style={{width:`${p.demand}%`}}/></div><b>{p.demand}</b></div></button>)}</section></div>}

    {section === 'documents' && <section className="card activity-card full-card"><div className="card-header"><div><h2>Документы</h2><p>{documents.length} файлов · нажмите на документ, чтобы открыть карточку</p></div></div><div className="document-list">{documents.map(doc => <button className="document-row" key={doc.id} onClick={() => setSelectedDocument(doc)}><div className="doc-icon"><Icon name="file" size={18}/></div><div><strong>{doc.name}</strong><span>{doc.updated} · {doc.size}</span></div><span className={`document-status ${doc.status === 'На согласовании' ? 'warning':''}`}>{doc.status}</span><Icon name="arrow" size={16}/></button>)}</div></section>}

    {programEditor && <div className="crm-overlay" onMouseDown={event => { if (event.target === event.currentTarget && !savingProgram) setProgramEditor(false) }}><section className="crm-modal" role="dialog" aria-modal="true" aria-labelledby="program-editor-title"><div className="modal-heading"><div><div className="eyebrow">НОВАЯ ПРОГРАММА</div><h2 id="program-editor-title">Добавить программу</h2></div><button className="modal-close" disabled={savingProgram} onClick={() => setProgramEditor(false)}>×</button></div><form className="modal-form" onSubmit={createProgram}><fieldset disabled={savingProgram}><label>Учебное заведение<select required value={draft.universityId} onChange={event => setDraft(current => ({ ...current, universityId: Number(event.target.value) }))}>{universities.map(university => <option key={university.id} value={university.id}>{university.shortName} · {university.city}</option>)}</select></label><label>Название программы<input autoFocus required maxLength={300} value={draft.name} onChange={event => setDraft(current => ({ ...current, name: event.target.value }))} /></label><label>ИТ-продукт<input required maxLength={200} value={draft.product} onChange={event => setDraft(current => ({ ...current, product: event.target.value }))} /></label><div className="modal-form-grid"><label>Обучающиеся<input min={0} type="number" value={draft.students} onChange={event => setDraft(current => ({ ...current, students: Number(event.target.value) }))} /></label><label>Потоки<input min={0} type="number" value={draft.streams} onChange={event => setDraft(current => ({ ...current, streams: Number(event.target.value) }))} /></label><label>Заявки<input min={0} type="number" value={draft.applications} onChange={event => setDraft(current => ({ ...current, applications: Number(event.target.value) }))} /></label><label>Спрос, %<input min={0} max={100} type="number" value={draft.demand} onChange={event => setDraft(current => ({ ...current, demand: Number(event.target.value) }))} /></label></div>{programError && <p className="form-error" role="alert">{programError}</p>}<div className="modal-actions"><button type="button" className="task-action" onClick={() => setProgramEditor(false)}>Отмена</button><button className="primary-button" type="submit">{savingProgram ? 'Добавление…' : 'Добавить программу'}</button></div></fieldset></form></section></div>}

    {selectedDocument && <div className="crm-overlay" onMouseDown={event => { if (event.target === event.currentTarget) setSelectedDocument(null) }}><section className="crm-modal document-modal" role="dialog" aria-modal="true" aria-labelledby="document-title"><div className="modal-heading"><div><div className="eyebrow">КАРТОЧКА ДОКУМЕНТА</div><h2 id="document-title">{selectedDocument.name}</h2></div><button className="modal-close" onClick={() => setSelectedDocument(null)}>×</button></div><dl className="document-details"><div><dt>Статус</dt><dd>{selectedDocument.status}</dd></div><div><dt>Размер</dt><dd>{selectedDocument.size}</dd></div><div><dt>Последнее изменение</dt><dd>{selectedDocument.updated}</dd></div></dl><div className="modal-actions"><button className="task-action" onClick={() => setSelectedDocument(null)}>Закрыть</button><button className="primary-button" onClick={() => { setDocuments(current => current.map(doc => doc.id === selectedDocument.id ? { ...doc, status: 'Готов' } : doc)); setSelectedDocument(current => current ? { ...current, status: 'Готов' } : current) }}>Отметить готовым</button></div></section></div>}
  </div>
}
function Metric({title,value,delta,detail}:{title:string;value:string;delta:string;detail:string}) { return <section className="metric-card card"><span>{title}</span><strong>{value}</strong><div><b>{delta}</b><small>{detail}</small></div></section> }
