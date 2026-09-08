import { useMemo, useState } from 'react'
import type { University } from '../types/domain'
import { Icon } from '../components/Icon'

export function UniversitiesPage({ universities, onOpen }: { universities: University[]; onOpen: (id: number) => void }) {
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => universities.filter((u) => `${u.name} ${u.city} ${u.shortName}`.toLowerCase().includes(query.toLowerCase())), [universities, query])

  return <div className="content">
    <div className="page-heading">
      <div><div className="eyebrow">УПРАВЛЕНИЕ УЧЕБНЫМИ ЗАВЕДЕНИЯМИ</div><h1>Вузы</h1><p className="muted">Контроль текущих взаимодействий и образовательных программ</p></div>
      <button className="primary-button"><Icon name="plus" size={18} /> Добавить вуз</button>
    </div>

    <section className="card universities-toolbar">
      <div className="list-search"><Icon name="search" size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск по названию, городу или аббревиатуре" /></div>
      <div className="toolbar-filter">Все статусы <span>⌄</span></div>
    </section>

    <section className="card universities-list">
      <div className="list-header"><div><h2>Учебные заведения</h2><p>{filtered.length} из {universities.length}</p></div></div>
      {filtered.map((university) => <button className="university-row" key={university.id} onClick={() => onOpen(university.id)}>
        <div className="university-logo">{university.shortName.slice(0, 2)}</div>
        <div className="university-main"><strong>{university.name}</strong><span>{university.shortName} · {university.city}</span></div>
        <div className="university-stat"><span>Программы</span><strong>{university.programsCount}</strong></div>
        <div className="university-stat"><span>Обучающиеся</span><strong>{university.students.toLocaleString('ru-RU')}</strong></div>
        <div className="university-progress"><span>Прогресс</span><div><i style={{ width: `${university.progress}%` }} /></div><strong>{university.progress}%</strong></div>
        <span className="university-status"><i />{university.status}</span><Icon name="arrow" size={17} />
      </button>)}
      {filtered.length === 0 && <div className="empty-state">По вашему запросу ничего не найдено.</div>}
    </section>
  </div>
}
