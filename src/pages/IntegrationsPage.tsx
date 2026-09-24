import { useMemo, useState } from 'react'
import { Icon } from '../components/Icon'
import '../integrations.css'

type Source = 'lms' | 'site'
type Direction = 'inbound' | 'outbound'
type Run = {
  id: number
  source: Source
  direction: Direction
  status: 'success'
  total: number
  created: number
  updated: number
  skipped: number
  at: string
}

const lmsPreview = [
  { external_id: 'LMS-10015', full_name: 'Иванов Иван Иванович', email: 'ivanov@example.ru', program_external_id: 'DEVOPS-01' },
  { external_id: 'LMS-10016', full_name: 'Петрова Анна Сергеевна', email: 'petrova@example.ru', program_external_id: 'DEVOPS-01' },
  { external_id: 'LMS-10017', full_name: 'Смирнов Максим Олегович', email: 'smirnov@example.ru', program_external_id: 'QA-02' },
]

const sitePreview = [
  { external_id: 'APP-8544', university: 'МГТУ им. Н. Э. Баумана', direction: 'DevOps', program: 'DevOps Tools', applicant_count: 87 },
  { external_id: 'APP-8545', university: 'МИРЭА', direction: 'QA', program: 'Software Testing', applicant_count: 64 },
  { external_id: 'APP-8546', university: 'НИУ ВШЭ', direction: 'Data Engineering', program: 'Data Platform', applicant_count: 53 },
]

const initialHistory: Run[] = [
  { id: 1, source: 'lms', direction: 'inbound', status: 'success', total: 124, created: 100, updated: 20, skipped: 4, at: '24.09.2026 12:40' },
  { id: 2, source: 'site', direction: 'inbound', status: 'success', total: 38, created: 0, updated: 38, skipped: 0, at: '24.09.2026 11:15' },
]

const sourceName = (source: Source) => source === 'lms' ? 'LMS ИТ Школы' : 'Сайт ИТ Школы'
const directionName = (direction: Direction) => direction === 'inbound' ? 'В CRM' : 'Из CRM'

export function IntegrationsPage() {
  const [source, setSource] = useState<Source>('lms')
  const [direction, setDirection] = useState<Direction>('inbound')
  const [history, setHistory] = useState<Run[]>(initialHistory)
  const [message, setMessage] = useState('')
  const [running, setRunning] = useState(false)

  const preview = source === 'lms' ? lmsPreview : sitePreview
  const payload = useMemo(() => ({
    source,
    direction,
    records: preview,
    total: source === 'lms' ? 124 : 38,
  }), [source, direction, preview])

  async function runSync() {
    setRunning(true)
    setMessage('')
    await new Promise(resolve => window.setTimeout(resolve, 650))
    const total = source === 'lms' ? 124 : 38
    const next: Run = {
      id: Date.now(),
      source,
      direction,
      status: 'success',
      total,
      created: direction === 'inbound' ? (source === 'lms' ? 100 : 0) : total,
      updated: direction === 'inbound' ? (source === 'lms' ? 20 : total) : 0,
      skipped: direction === 'inbound' && source === 'lms' ? 4 : 0,
      at: new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date()),
    }
    setHistory(current => [next, ...current])
    setRunning(false)
    setMessage(direction === 'inbound'
      ? `Демо-синхронизация завершена: получено ${total} записей. После подключения backend здесь будет реальный импорт.`
      : `Демо-выгрузка завершена: подготовлено ${total} записей для внешней системы.`)
  }

  return <div className="content integrations-page">
    <div className="page-heading">
      <div>
        <div className="eyebrow">ДВУСТОРОННИЕ ИНТЕГРАЦИИ</div>
        <h1>LMS и сайт</h1>
        <p className="muted">Демонстрационный контур обмена JSON. По условиям кейса реальный API заменён моками до получения контрактов заказчика.</p>
      </div>
    </div>

    <section className="integration-source-grid">
      <button className={`card integration-source ${source === 'lms' ? 'active' : ''}`} onClick={() => setSource('lms')}>
        <span className="integration-source-icon"><Icon name="book" size={22} /></span>
        <div><strong>LMS ИТ Школы</strong><small>Списки обучающихся и данные программ</small></div>
        <b>{source === 'lms' ? 'Выбрано' : 'Выбрать'}</b>
      </button>
      <button className={`card integration-source ${source === 'site' ? 'active' : ''}`} onClick={() => setSource('site')}>
        <span className="integration-source-icon"><Icon name="grid" size={22} /></span>
        <div><strong>Сайт ИТ Школы</strong><small>Заявки и статистика востребованности</small></div>
        <b>{source === 'site' ? 'Выбрано' : 'Выбрать'}</b>
      </button>
    </section>

    <div className="integration-layout">
      <section className="card integration-control">
        <div className="card-header"><div><h2>Параметры обмена</h2><p>{sourceName(source)}</p></div></div>
        <div className="integration-direction">
          <button className={direction === 'inbound' ? 'active' : ''} onClick={() => setDirection('inbound')}>Получить в CRM</button>
          <button className={direction === 'outbound' ? 'active' : ''} onClick={() => setDirection('outbound')}>Отправить из CRM</button>
        </div>
        <dl className="integration-summary">
          <div><dt>Источник</dt><dd>{sourceName(source)}</dd></div>
          <div><dt>Направление</dt><dd>{directionName(direction)}</dd></div>
          <div><dt>Формат</dt><dd>JSON</dd></div>
          <div><dt>Режим</dt><dd>Mock API</dd></div>
        </dl>
        <button className="primary-button integration-run" disabled={running} onClick={() => void runSync()}>
          {running ? 'Синхронизация…' : direction === 'inbound' ? 'Запустить импорт' : 'Подготовить выгрузку'}
        </button>
        {message && <p className="integration-message" role="status">{message}</p>}
      </section>

      <section className="card integration-preview">
        <div className="card-header"><div><h2>Предпросмотр JSON</h2><p>Первые записи до применения изменений</p></div><span className="integration-chip">MOCK</span></div>
        <pre>{JSON.stringify(payload, null, 2)}</pre>
      </section>
    </div>

    <section className="card integration-history">
      <div className="card-header"><div><h2>Журнал синхронизаций</h2><p>Направление, результат и количество обработанных записей</p></div></div>
      <div className="integration-history-table">
        <div className="integration-history-head"><span>Система</span><span>Направление</span><span>Результат</span><span>Обработано</span><span>Создано / обновлено</span><span>Время</span></div>
        {history.map(run => <article key={run.id}>
          <strong>{sourceName(run.source)}</strong>
          <span>{directionName(run.direction)}</span>
          <span className="integration-success">Успешно</span>
          <span>{run.total}</span>
          <span>{run.created} / {run.updated}{run.skipped ? ` · пропущено ${run.skipped}` : ''}</span>
          <span>{run.at}</span>
        </article>)}
      </div>
    </section>
  </div>
}
