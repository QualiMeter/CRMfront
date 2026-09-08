import { useMemo, useState } from 'react'
import { Icon } from '../components/Icon'
import type { Activity, Program } from '../types/domain'

type Section = 'programs' | 'analytics' | 'tasks' | 'documents'

const sectionMeta: Record<Section, { eyebrow: string; title: string; description: string }> = {
  programs: { eyebrow: 'КАТАЛОГ ОБРАЗОВАТЕЛЬНЫХ ПРОГРАММ', title: 'Программы', description: 'Единый список программ, продуктов и показателей востребованности' },
  analytics: { eyebrow: 'АНАЛИТИКА И РЕЙТИНГ', title: 'Аналитика', description: 'Сводные показатели подготовки ИТ-кадров и востребованности программ' },
  tasks: { eyebrow: 'РАБОЧИЙ ЦЕНТР', title: 'Задачи', description: 'Контроль поручений и этапов взаимодействия с учебными заведениями' },
  documents: { eyebrow: 'ДОКУМЕНТООБОРОТ', title: 'Документы', description: 'Пакет документов по договорам, программам и внедрению продуктов' },
}

export function SectionPage({ section, programs, activities, onOpenUniversity }: { section: Section; programs: Program[]; activities: Activity[]; onOpenUniversity: (id: number, programId?: number) => void }) {
  const meta = sectionMeta[section]
  const [query, setQuery] = useState('')
  const filteredPrograms = useMemo(() => programs.filter((p) => `${p.name} ${p.product} ${p.stage}`.toLowerCase().includes(query.toLowerCase())), [programs, query])

  return <div className="content">
    <div className="page-heading"><div><div className="eyebrow">{meta.eyebrow}</div><h1>{meta.title}</h1><p className="muted">{meta.description}</p></div><button className="primary-button" onClick={() => alert('Действие доступно в демо') }><Icon name="plus" size={18} /> {section === 'tasks' ? 'Новая задача' : section === 'documents' ? 'Загрузить документ' : 'Добавить'}</button></div>

    {section === 'programs' && <section className="card universities-list"><div className="list-header section-toolbar"><div><h2>Все программы</h2><p>{filteredPrograms.length} программ в демо</p></div><div className="list-search compact-search"><Icon name="search" size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Поиск программы или продукта"/></div></div><div className="table-wrap"><table><thead><tr><th>Программа</th><th>ИТ-продукт</th><th>Обучающиеся</th><th>Потоки</th><th>Востребованность</th><th>Этап</th></tr></thead><tbody>{filteredPrograms.map(p => <tr key={p.id}><td><button className="program-link" onClick={() => onOpenUniversity(p.universityId, p.id)}>{p.name}</button><span className="table-secondary">{p.applications.toLocaleString('ru-RU')} заявок</span></td><td>{p.product}</td><td>{p.students}</td><td>{p.streams}</td><td><div className="demand"><div className="demand-bar"><span style={{width:`${p.demand}%`}}/></div><strong>{p.demand}%</strong></div></td><td><span className="stage-tag">{p.stage}</span></td></tr>)}</tbody></table></div></section>}

    {section === 'analytics' && <div className="analytics-grid"><Metric title="Заявки на обучение" value="8 420" delta="+18,4%" detail="к предыдущему периоду"/><Metric title="Обучающиеся" value="4 860" delta="+11,2%" detail="по активным программам"/><Metric title="Активные потоки" value="42" delta="+6" detail="за текущий период"/><section className="card chart-card"><div className="card-header"><div><h2>Востребованность направлений</h2><p>Индекс на основе заявок, обучающихся и потоков</p></div></div>{programs.slice(0,5).map(p => <div className="rank-row" key={p.id}><div><strong>{p.name}</strong><span>{p.product}</span></div><div className="rank-value"><div className="demand-bar"><span style={{width:`${p.demand}%`}}/></div><b>{p.demand}</b></div></div>)}</section></div>}

    {section === 'tasks' && <section className="card activity-card full-card"><div className="card-header"><div><h2>Мои задачи</h2><p>Контроль текущих действий по вузам</p></div><span className="status-pill"><span/>7 активных</span></div><div className="task-list">{['Согласовать дату обучения преподавателей','Проверить пакет документов МГТУ','Подтвердить состав потока DevOps','Обновить карточку программы','Отправить материалы ответственному'].map((task,i)=><button className="task-row" key={task} onClick={() => alert(`Открыта задача: ${task}`)}><span className={`task-check ${i < 2 ? 'done':''}`}>{i < 2 ? '✓' : ''}</span><div><strong>{task}</strong><span>{i % 2 ? 'МГТУ · сегодня' : 'МФТИ · завтра'}</span></div><span className="task-priority">{i === 2 ? 'Важно' : 'В работе'}</span><Icon name="arrow" size={16}/></button>)}</div></section>}

    {section === 'documents' && <section className="card activity-card full-card"><div className="card-header"><div><h2>Документы</h2><p>Последние документы и статусы согласования</p></div></div><div className="document-list">{['Договор о сотрудничестве.pdf','Учебная программа — DevOps.docx','Лицензия ИТ-продукта.pdf','Методические материалы.zip','Протокол встречи.pdf'].map((name,i)=><button className="document-row" key={name} onClick={() => alert(`Открыт документ: ${name}`)}><div className="doc-icon"><Icon name="file" size={18}/></div><div><strong>{name}</strong><span>{i % 2 ? 'Изменён вчера' : 'Загружен сегодня'}</span></div><span className={`document-status ${i === 1 ? 'warning':''}`}>{i === 1 ? 'На согласовании' : 'Готов'}</span><Icon name="arrow" size={16}/></button>)}</div></section>}

    {section !== 'programs' && section !== 'analytics' && section !== 'tasks' && section !== 'documents' ? <></> : null}
  </div>
}

function Metric({title,value,delta,detail}:{title:string;value:string;delta:string;detail:string}) { return <section className="metric-card card"><span>{title}</span><strong>{value}</strong><div><b>{delta}</b><small>{detail}</small></div></section> }
