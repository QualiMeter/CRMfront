import '../overview.css'
import { Icon } from '../components/Icon'
import type { Activity, CrmTask, Program, University } from '../types/domain'

interface Props {
  universities: University[]
  programs: Program[]
  activities: Activity[]
  tasks: CrmTask[]
  onOpenUniversity: (id: number) => void
  onOpenUniversities: () => void
  onOpenPrograms: () => void
  onOpenTasks: () => void
  onOpenAnalytics: () => void
}

function localDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDueDate(value: string) {
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(parsed)
}

function taskPriorityLabel(priority: CrmTask['priority']) {
  if (priority === 'high') return 'Высокий'
  if (priority === 'low') return 'Низкий'
  return 'Обычный'
}

export function OverviewPage({ universities, programs, activities, tasks, onOpenUniversity, onOpenUniversities, onOpenPrograms, onOpenTasks, onOpenAnalytics }: Props) {
  const openTasks = tasks.filter(task => task.status === 'open')
  const today = localDateKey()
  const overdueTasks = openTasks.filter(task => task.dueDate < today)
  const completedStages = programs.flatMap(program => program.workflow).filter(stage => stage.status === 'done').length
  const totalStages = programs.reduce((sum, program) => sum + program.workflow.length, 0)
  const blockedStages = programs.flatMap(program => program.workflow).filter(stage => stage.status === 'blocked')
  const averageProgress = universities.length ? Math.round(universities.reduce((sum, university) => sum + university.progress, 0) / universities.length) : 0
  const averageDemand = programs.length ? Math.round(programs.reduce((sum, program) => sum + program.demand, 0) / programs.length) : 0
  const totalStudents = universities.reduce((sum, university) => sum + university.students, 0)
  const activePrograms = universities.reduce((sum, university) => sum + university.activePrograms, 0)
  const stageProgress = totalStages ? Math.round((completedStages / totalStages) * 100) : 0

  const upcomingTasks = [...openTasks].sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 5)
  const topPrograms = [...programs].sort((a, b) => b.demand - a.demand).slice(0, 4)
  const focusUniversities = [...universities]
    .sort((a, b) => a.progress - b.progress)
    .slice(0, 4)

  return <div className="content overview-page">
    <div className="page-heading overview-heading">
      <div>
        <div className="eyebrow">ОБЩАЯ КАРТИНА</div>
        <h1>Обзор</h1>
        <p className="muted">Ключевые показатели взаимодействия с учебными заведениями</p>
      </div>
      <button className="primary-button" onClick={onOpenUniversities}><Icon name="building" size={17} /> Открыть вузы</button>
    </div>

    <section className="overview-kpis" aria-label="Ключевые показатели">
      <article className="card overview-kpi">
        <div className="overview-kpi-top"><span>Учебные заведения</span><i className="overview-kpi-icon"><Icon name="building" size={17} /></i></div>
        <strong>{universities.length}</strong>
        <p>{activePrograms} активных программ</p>
      </article>
      <article className="card overview-kpi">
        <div className="overview-kpi-top"><span>Обучающиеся</span><i className="overview-kpi-icon"><Icon name="users" size={17} /></i></div>
        <strong>{totalStudents.toLocaleString('ru-RU')}</strong>
        <p>Средний спрос по программам — {averageDemand}%</p>
      </article>
      <article className="card overview-kpi">
        <div className="overview-kpi-top"><span>Прогресс взаимодействия</span><i className="overview-kpi-icon"><Icon name="chart" size={17} /></i></div>
        <strong>{averageProgress}%</strong>
        <div className="overview-meter"><span style={{ width: `${averageProgress}%` }} /></div>
        <p>{completedStages} из {totalStages} этапов завершено · {stageProgress}%</p>
      </article>
      <article className={`card overview-kpi ${overdueTasks.length ? 'overview-kpi-alert' : ''}`}>
        <div className="overview-kpi-top"><span>Открытые задачи</span><i className="overview-kpi-icon"><Icon name="check" size={17} /></i></div>
        <strong>{openTasks.length}</strong>
        <p>{overdueTasks.length ? `${overdueTasks.length} просрочено — требуют внимания` : 'Просроченных задач нет'}</p>
      </article>
    </section>

    {(overdueTasks.length > 0 || blockedStages.length > 0) && <section className="overview-attention" aria-label="Требует внимания">
      <div className="overview-attention-copy">
        <span className="overview-attention-mark">!</span>
        <div><strong>Требует внимания</strong><p>{overdueTasks.length > 0 && `${overdueTasks.length} просроченных задач`}{overdueTasks.length > 0 && blockedStages.length > 0 ? ' · ' : ''}{blockedStages.length > 0 && `${blockedStages.length} заблокированных этапов`}</p></div>
      </div>
      <button onClick={overdueTasks.length ? onOpenTasks : onOpenPrograms}>Посмотреть <Icon name="arrow" size={15} /></button>
    </section>}

    <div className="overview-main-grid">
      <section className="card overview-panel">
        <div className="overview-panel-header">
          <div><h2>Ближайшие задачи</h2><p>Что нужно сделать в первую очередь</p></div>
          <button className="overview-link" onClick={onOpenTasks}>Все задачи <Icon name="arrow" size={14} /></button>
        </div>
        <div className="overview-task-list">
          {upcomingTasks.map(task => {
            const university = universities.find(item => item.id === task.universityId)
            const program = task.programId ? programs.find(item => item.id === task.programId) : undefined
            const overdue = task.dueDate < today
            return <button className="overview-task" key={task.id} onClick={() => onOpenUniversity(task.universityId)}>
              <span className={`overview-task-check ${overdue ? 'danger' : ''}`}><Icon name={overdue ? 'clock' : 'check'} size={14} /></span>
              <span className="overview-task-copy"><strong>{task.title}</strong><small>{university?.shortName ?? 'Вуз'}{program ? ` · ${program.name}` : ''} · {task.owner}</small></span>
              <span className={`overview-task-date ${overdue ? 'danger' : ''}`}>{overdue ? 'Просрочено · ' : ''}{formatDueDate(task.dueDate)}</span>
            </button>
          })}
          {upcomingTasks.length === 0 && <div className="overview-empty">Открытых задач нет.</div>}
        </div>
      </section>

      <section className="card overview-panel">
        <div className="overview-panel-header">
          <div><h2>Вузы в фокусе</h2><p>Наименьший текущий прогресс</p></div>
          <button className="overview-link" onClick={onOpenUniversities}>Все вузы <Icon name="arrow" size={14} /></button>
        </div>
        <div className="overview-focus-list">
          {focusUniversities.map(university => {
            const universityOpenTasks = openTasks.filter(task => task.universityId === university.id).length
            return <button className="overview-focus" key={university.id} onClick={() => onOpenUniversity(university.id)}>
              <span className="overview-focus-logo">{university.shortName.slice(0, 2)}</span>
              <span className="overview-focus-copy"><strong>{university.shortName}</strong><small>{university.city} · {universityOpenTasks} откр. задач</small></span>
              <span className="overview-focus-progress"><b>{university.progress}%</b><i><span style={{ width: `${university.progress}%` }} /></i></span>
            </button>
          })}
          {focusUniversities.length === 0 && <div className="overview-empty">Вузы пока не добавлены.</div>}
        </div>
      </section>
    </div>

    <div className="overview-lower-grid">
      <section className="card overview-panel">
        <div className="overview-panel-header">
          <div><h2>Востребованные программы</h2><p>Рейтинг по интегральному показателю спроса</p></div>
          <button className="overview-link" onClick={onOpenAnalytics}>Аналитика <Icon name="arrow" size={14} /></button>
        </div>
        <div className="overview-program-list">
          {topPrograms.map((program, index) => {
            const university = universities.find(item => item.id === program.universityId)
            return <button className="overview-program" key={program.id} onClick={() => onOpenUniversity(program.universityId)}>
              <span className="overview-program-rank">{index + 1}</span>
              <span className="overview-program-copy"><strong>{program.name}</strong><small>{university?.shortName ?? 'Вуз'} · {program.product}</small></span>
              <span className="overview-demand"><b>{program.demand}%</b><i><span style={{ width: `${program.demand}%` }} /></i></span>
            </button>
          })}
          {topPrograms.length === 0 && <div className="overview-empty">Нет данных по программам.</div>}
        </div>
      </section>

      <section className="card overview-panel">
        <div className="overview-panel-header">
          <div><h2>Последняя активность</h2><p>Изменения в карточках вузов</p></div>
        </div>
        <div className="overview-activity-list">
          {activities.slice(0, 5).map(activity => {
            const university = universities.find(item => item.id === activity.universityId)
            return <button className="overview-activity" key={`${activity.universityId}-${activity.id}`} onClick={() => onOpenUniversity(activity.universityId)}>
              <span className={`overview-activity-dot ${activity.type}`} />
              <span><strong>{activity.title}</strong><small>{activity.description}</small><em>{university?.shortName ?? 'Вуз'} · {activity.time}</em></span>
            </button>
          })}
          {activities.length === 0 && <div className="overview-empty">Активность пока отсутствует.</div>}
        </div>
      </section>
    </div>

    <section className="overview-quick card">
      <div><strong>Быстрые действия</strong><span>Перейдите сразу к нужному рабочему разделу</span></div>
      <div className="overview-quick-actions">
        <button onClick={onOpenPrograms}><Icon name="book" size={16} /> Программы</button>
        <button onClick={onOpenTasks}><Icon name="check" size={16} /> Задачи <span>{openTasks.length}</span></button>
        <button onClick={onOpenAnalytics}><Icon name="chart" size={16} /> Аналитика</button>
      </div>
    </section>

    {upcomingTasks.length > 0 && <p className="overview-footnote">Приоритет ближайшей задачи: {taskPriorityLabel(upcomingTasks[0].priority)}.</p>}
  </div>
}
