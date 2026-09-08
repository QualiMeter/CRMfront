import { useMemo, useState } from 'react'
import type { University } from '../types/domain'
import { Icon } from '../components/Icon'

export function UniversitiesPage({ universities, onOpen }: { universities: University[]; onOpen: (id: number) => void }) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const statuses = [...new Set(universities.map(university => university.status))]
  const filtered = useMemo(() => universities.filter((u) => (!status || u.status === status) && `${u.name} ${u.city} ${u.shortName}`.toLowerCase().includes(query.toLowerCase())), [universities, query, status])

  return <div className="content">
    <div className="page-heading">
      <div><div className="eyebrow">УПРАВЛЕНИЕ УЧЕБНЫМИ ЗАВЕДЕНИЯМИ</div><h1>Вузы</h1><p className="muted">Контроль текущих взаимодействий и образовательных программ</p></div>
      <button className="primary-button"><Icon name="plus" size={18} /> Добавить вуз</button>
    </div>

    <section className="card universities-toolbar">
      <div className="list-search"><Icon name="search" size={17} /><input aria-label="Поиск учебного заведения" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск по названию, городу или аббревиатуре" /></div>
      <select className="toolbar-filter" aria-label="Статус взаимодействия" value={status} onChange={event => setStatus(event.target.value)}><option value="">Все статусы</option>{statuses.map(value => <option key={value} value={value}>{value}</option>)}</select>
    </section>

    <section className="card universities-list">
      <div className="list-header"><div><h2>Учебные заведения</h2><p>{filtered.length} из {universities.length}</p></div></div>
      {filtered.map((university) => <button className="university-row university-desktop-row" key={university.id} onClick={() => onOpen(university.id)}>
        <div className="university-logo">{university.shortName.slice(0, 2)}</div>
        <div className="university-main"><strong>{university.name}</strong><span>{university.shortName} · {university.city}</span></div>
        <div className="university-stat"><span>Программы</span><strong>{university.programsCount}</strong></div>
        <div className="university-stat"><span>Обучающиеся</span><strong>{university.students.toLocaleString('ru-RU')}</strong></div>
        <div className="university-progress"><span>Прогресс</span><div><i style={{ width: `${university.progress}%` }} /></div><strong>{university.progress}%</strong></div>
        <span className="university-status"><i />{university.status}</span><Icon name="arrow" size={17} />
      </button>)}
      <div className="university-mobile-list">{filtered.map(university => <article className="university-mobile-card" key={university.id}>
        <div className="university-card-heading"><span className="university-logo" aria-hidden="true">{university.shortName.slice(0, 2)}</span><div><h2><button className="university-open" onClick={() => onOpen(university.id)}>{university.name}</button></h2><p>{university.shortName} · {university.city}</p></div></div>
        <span className="university-status"><i />{university.status}</span>
        <dl className="university-card-metrics"><div><dt>Программы</dt><dd>{university.programsCount}</dd></div><div><dt>Обучающиеся</dt><dd>{university.students.toLocaleString('ru-RU')}</dd></div></dl>
        <div className="university-card-progress"><label htmlFor={`university-progress-${university.id}`}>Прогресс взаимодействия <strong>{university.progress}%</strong></label><progress id={`university-progress-${university.id}`} max={100} value={university.progress} /></div>
        <button className="university-open-button" onClick={() => onOpen(university.id)}>Открыть карточку <Icon name="arrow" size={18} /></button>
      </article>)}</div>
      {filtered.length === 0 && <div className="empty-state">По вашему запросу ничего не найдено.</div>}
    </section>
  </div>
}
