import { ProgramList } from '../components/ProgramList'
import { useMemo, useState, type ChangeEvent, type FormEvent, type MouseEvent } from 'react'
import { Icon } from '../components/Icon'
import type { ItDirection, Program, ProgramInput, University } from '../types/domain'

type Section = 'programs' | 'analytics'

const sectionMeta: Record<Section, { eyebrow: string; title: string; description: string }> = {
  programs: { eyebrow: 'КАТАЛОГ ОБРАЗОВАТЕЛЬНЫХ ПРОГРАММ', title: 'Программы', description: 'Единый список программ, продуктов и показателей востребованности' },
  analytics: { eyebrow: 'АНАЛИТИКА И РЕЙТИНГ', title: 'Аналитика', description: 'Сводные показатели подготовки ИТ-кадров и востребованности программ' },
}

export function SectionPage({ section, programs, universities, directions, onOpenUniversity, onCreateProgram, canCreate = false }: { section: Section; programs: Program[]; universities: University[]; directions: ItDirection[]; onOpenUniversity: (id: number, programId?: number) => void; onCreateProgram: (input: ProgramInput) => Promise<void>; canCreate?: boolean }) {
  const meta = sectionMeta[section]
  const [query, setQuery] = useState('')
  const [programEditor, setProgramEditor] = useState(false)
  const [programError, setProgramError] = useState('')
  const [savingProgram, setSavingProgram] = useState(false)
  const [draft, setDraft] = useState<ProgramInput>({ universityId: universities[0]?.id ?? 0, directionId: directions[0]?.id, name: '', product: '', students: 0, streams: 0, applications: 0, demand: 50 })
  const filteredPrograms = useMemo(() => programs.filter((p) => `${p.direction ?? ''} ${p.name} ${p.product} ${p.stage}`.toLowerCase().includes(query.toLowerCase())), [programs, query])
  const totals = useMemo(() => ({ applications: programs.reduce((sum, p) => sum + p.applications, 0), students: programs.reduce((sum, p) => sum + p.students, 0), streams: programs.reduce((sum, p) => sum + p.streams, 0) }), [programs])

  async function createProgram(event: FormEvent) {
    event.preventDefault(); if (savingProgram) return
    setSavingProgram(true); setProgramError('')
    try { if (!draft.directionId) throw new Error('Выберите ИТ-направление'); await onCreateProgram(draft); setProgramEditor(false); setDraft(current => ({ ...current, directionId: directions[0]?.id, name: '', product: '', students: 0, streams: 0, applications: 0, demand: 50 })) }
    catch (error) { setProgramError(error instanceof Error ? error.message : 'Не удалось добавить программу') }
    finally { setSavingProgram(false) }
  }

  return <div className="content">
    <div className="page-heading"><div><div className="eyebrow">{meta.eyebrow}</div><h1>{meta.title}</h1><p className="muted">{meta.description}</p></div>{section === 'programs' && canCreate && <button className="primary-button" onClick={() => setProgramEditor(true)}><Icon name="plus" size={18} /> Добавить программу</button>}</div>

    {section === 'programs' && <section className="card universities-list"><div className="list-header section-toolbar"><div><h2>Все программы</h2><p>{filteredPrograms.length} программ</p></div><div className="list-search compact-search"><Icon name="search" size={17}/><input aria-label="Поиск программы или продукта" value={query} onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)} placeholder="Поиск программы или продукта"/></div></div><ProgramList programs={filteredPrograms} onSelect={(program: Program) => onOpenUniversity(program.universityId, program.id)} /></section>}

    {section === 'analytics' && <div className="analytics-grid"><Metric title="Заявки на обучение" value={totals.applications.toLocaleString('ru-RU')} delta={`${programs.length} программ`} detail="в текущей выборке"/><Metric title="Обучающиеся" value={totals.students.toLocaleString('ru-RU')} delta={`${universities.length} вузов`} detail="по активным карточкам"/><Metric title="Активные потоки" value={totals.streams.toLocaleString('ru-RU')} delta={`${Math.round(programs.reduce((sum,p)=>sum+p.demand,0)/Math.max(1,programs.length))}%`} detail="средний индекс спроса"/><section className="card chart-card"><div className="card-header"><div><h2>Востребованность направлений</h2><p>Индекс на основе заявок, обучающихся и потоков</p></div></div>{[...programs].sort((a,b)=>b.demand-a.demand).slice(0,5).map(p => <button className="rank-row rank-row-button" key={p.id} onClick={() => onOpenUniversity(p.universityId, p.id)}><div><strong>{p.name}</strong><span>{p.product}</span></div><div className="rank-value"><div className="demand-bar"><span style={{width:`${p.demand}%`}}/></div><b>{p.demand}</b></div></button>)}</section></div>}

    {programEditor && <div className="crm-overlay" onMouseDown={(event: MouseEvent<HTMLDivElement>) => { if (event.target === event.currentTarget && !savingProgram) setProgramEditor(false) }}><section className="crm-modal" role="dialog" aria-modal="true" aria-labelledby="program-editor-title"><div className="modal-heading"><div><div className="eyebrow">НОВАЯ ПРОГРАММА</div><h2 id="program-editor-title">Добавить программу</h2></div><button className="modal-close" disabled={savingProgram} onClick={() => setProgramEditor(false)}>×</button></div><form className="modal-form" onSubmit={createProgram}><fieldset disabled={savingProgram}><label>Учебное заведение<select required value={draft.universityId} onChange={(event: ChangeEvent<HTMLSelectElement>) => setDraft(current => ({ ...current, universityId: Number(event.target.value) }))}>{universities.map(university => <option key={university.id} value={university.id}>{university.shortName} · {university.city}</option>)}</select></label><label>ИТ-направление<select required value={draft.directionId ?? ''} onChange={(event: ChangeEvent<HTMLSelectElement>) => setDraft(current => ({ ...current, directionId: Number(event.target.value) || undefined }))}><option value="">Выберите направление</option>{directions.map(direction => <option key={direction.id} value={direction.id}>{direction.name}</option>)}</select></label><label>Название программы<input autoFocus required maxLength={300} value={draft.name} onChange={(event: ChangeEvent<HTMLInputElement>) => setDraft(current => ({ ...current, name: event.target.value }))} /></label><label>ИТ-продукт<input required maxLength={200} value={draft.product} onChange={(event: ChangeEvent<HTMLInputElement>) => setDraft(current => ({ ...current, product: event.target.value }))} /></label><div className="modal-form-grid"><label>Обучающиеся<input min={0} type="number" value={draft.students} onChange={(event: ChangeEvent<HTMLInputElement>) => setDraft(current => ({ ...current, students: Number(event.target.value) }))} /></label><label>Потоки<input min={0} type="number" value={draft.streams} onChange={(event: ChangeEvent<HTMLInputElement>) => setDraft(current => ({ ...current, streams: Number(event.target.value) }))} /></label><label>Заявки<input min={0} type="number" value={draft.applications} onChange={(event: ChangeEvent<HTMLInputElement>) => setDraft(current => ({ ...current, applications: Number(event.target.value) }))} /></label><label>Спрос, %<input min={0} max={100} type="number" value={draft.demand} onChange={(event: ChangeEvent<HTMLInputElement>) => setDraft(current => ({ ...current, demand: Number(event.target.value) }))} /></label></div>{!directions.length && <p className="form-error" role="alert">На backend пока нет ИТ-направлений. Сначала заполните справочник it_directions.</p>}{programError && <p className="form-error" role="alert">{programError}</p>}<div className="modal-actions"><button type="button" className="task-action" onClick={() => setProgramEditor(false)}>Отмена</button><button className="primary-button" type="submit">{savingProgram ? 'Добавление…' : 'Добавить программу'}</button></div></fieldset></form></section></div>}
  </div>
}
function Metric({title,value,delta,detail}:{title:string;value:string;delta:string;detail:string}) { return <section className="metric-card card"><span>{title}</span><strong>{value}</strong><div><b>{delta}</b><small>{detail}</small></div></section> }
