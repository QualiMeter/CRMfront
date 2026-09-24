import { useMemo, useState, type ChangeEvent } from 'react'
import type { TDocumentDefinitions } from 'pdfmake/interfaces'
import { Icon } from '../components/Icon'
import { currentStage } from '../domain/workflow'
import type { CrmDocument, CrmTask, Program, University } from '../types/domain'
import '../analytics.css'

interface AnalyticsPageProps {
  universities: University[]
  programs: Program[]
  tasks: CrmTask[]
  documents: CrmDocument[]
  onOpenUniversity: (id: number, programId?: number) => void
  onOpenTasks: () => void
  onOpenDocuments: () => void
}

function localToday() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function pct(value: number) {
  return `${Math.round(value)}%`
}

function escapeSvg(value: string) {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character] ?? character)
}

function demandChartSvg(programs: Program[]) {
  const width = 720
  const rowHeight = 54
  const height = Math.max(120, 54 + programs.length * rowHeight)
  const rows = programs.map((program, index) => {
    const y = 48 + index * rowHeight
    const barWidth = Math.max(2, Math.min(420, program.demand / 100 * 420))
    const label = escapeSvg(`${program.direction || 'Без направления'} · ${program.name}`)
    return `<text x="16" y="${y}" font-size="13" font-family="Arial" fill="#344054">${label}</text><rect x="16" y="${y + 10}" width="420" height="12" rx="6" fill="#eaecf0"/><rect x="16" y="${y + 10}" width="${barWidth}" height="12" rx="6" fill="#f04438"/><text x="452" y="${y + 21}" font-size="13" font-weight="700" font-family="Arial" fill="#344054">${Math.round(program.demand)}%</text>`
  }).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#ffffff"/><text x="16" y="24" font-size="16" font-weight="700" font-family="Arial" fill="#101828">Лидеры по востребованности</text>${rows}</svg>`
}

export function AnalyticsPage({ universities, programs, tasks, documents, onOpenUniversity, onOpenTasks, onOpenDocuments }: AnalyticsPageProps) {
  const [universityId, setUniversityId] = useState<number | 'all'>('all')
  const [exportMessage, setExportMessage] = useState('')

  const scopedUniversities = useMemo(
    () => universityId === 'all' ? universities : universities.filter(university => university.id === universityId),
    [universities, universityId],
  )
  const scopedPrograms = useMemo(
    () => universityId === 'all' ? programs : programs.filter(program => program.universityId === universityId),
    [programs, universityId],
  )
  const scopedTasks = useMemo(
    () => universityId === 'all' ? tasks : tasks.filter(task => task.universityId === universityId),
    [tasks, universityId],
  )
  const scopedDocuments = useMemo(
    () => universityId === 'all' ? documents : documents.filter(document => document.universityId === universityId),
    [documents, universityId],
  )

  const metrics = useMemo(() => {
    const applications = scopedPrograms.reduce((sum, program) => sum + program.applications, 0)
    const students = scopedPrograms.reduce((sum, program) => sum + program.students, 0)
    const streams = scopedPrograms.reduce((sum, program) => sum + program.streams, 0)
    const averageDemand = scopedPrograms.length
      ? scopedPrograms.reduce((sum, program) => sum + program.demand, 0) / scopedPrograms.length
      : 0
    const averageProgress = scopedUniversities.length
      ? scopedUniversities.reduce((sum, university) => sum + university.progress, 0) / scopedUniversities.length
      : 0
    return { applications, students, streams, averageDemand, averageProgress }
  }, [scopedPrograms, scopedUniversities])

  const topPrograms = useMemo(
    () => [...scopedPrograms].sort((a, b) => b.demand - a.demand || b.applications - a.applications).slice(0, 6),
    [scopedPrograms],
  )

  const productStats = useMemo(() => {
    const byProduct = new Map<string, { product: string; programs: number; applications: number; students: number; demand: number }>()
    scopedPrograms.forEach(program => {
      const current = byProduct.get(program.product) ?? { product: program.product, programs: 0, applications: 0, students: 0, demand: 0 }
      current.programs += 1
      current.applications += program.applications
      current.students += program.students
      current.demand += program.demand
      byProduct.set(program.product, current)
    })
    return [...byProduct.values()]
      .map(item => ({ ...item, demand: item.programs ? item.demand / item.programs : 0 }))
      .sort((a, b) => b.demand - a.demand || b.applications - a.applications)
  }, [scopedPrograms])

  const workflowStats = useMemo(() => {
    const stages = scopedPrograms.flatMap(program => program.workflow)
    const total = stages.length || 1
    const counts = {
      done: stages.filter(stage => stage.status === 'done').length,
      active: stages.filter(stage => stage.status === 'active').length,
      blocked: stages.filter(stage => stage.status === 'blocked').length,
      pending: stages.filter(stage => stage.status === 'pending').length,
    }
    return { total, counts }
  }, [scopedPrograms])

  const funnel = useMemo(() => {
    const template = scopedPrograms[0]?.workflow ?? []
    return template.map(stage => {
      const reached = scopedPrograms.filter(program => {
        const current = currentStage(program.workflow)
        return current ? current.order >= stage.order : false
      }).length
      return { order: stage.order, title: stage.shortTitle, reached }
    })
  }, [scopedPrograms])

  const universityRows = useMemo(() => scopedUniversities.map(university => {
    const relatedPrograms = scopedPrograms.filter(program => program.universityId === university.id)
    const averageDemand = relatedPrograms.length ? relatedPrograms.reduce((sum, program) => sum + program.demand, 0) / relatedPrograms.length : 0
    const openTasks = scopedTasks.filter(task => task.universityId === university.id && task.status === 'open').length
    return { university, averageDemand, openTasks }
  }).sort((a, b) => b.university.progress - a.university.progress), [scopedUniversities, scopedPrograms, scopedTasks])

  const risks = useMemo(() => {
    const today = localToday()
    const overdue = scopedTasks.filter(task => task.status === 'open' && task.dueDate < today)
    const blocked = scopedPrograms.flatMap(program => program.workflow.filter(stage => stage.status === 'blocked').map(stage => ({ program, stage })))
    const rejected = scopedDocuments.filter(document => document.status === 'rejected')
    const lowProgress = scopedUniversities.filter(university => university.progress < 25)
    return { overdue, blocked, rejected, lowProgress }
  }, [scopedTasks, scopedPrograms, scopedDocuments, scopedUniversities])

  const maxFunnel = Math.max(1, scopedPrograms.length)
  const scopeLabel = universityId === 'all' ? 'Все вузы' : scopedUniversities[0]?.name ?? 'Выбранный вуз'

  function exportPng() {
    if (!topPrograms.length) return setExportMessage('В выбранном срезе нет данных для экспорта.')
    const canvas = document.createElement('canvas')
    canvas.width = 1400
    canvas.height = 900
    const context = canvas.getContext('2d')
    if (!context) return setExportMessage('Браузер не поддерживает экспорт PNG.')

    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = '#101828'
    context.font = 'bold 38px Arial'
    context.fillText('RTK Education CRM — аналитика', 70, 72)
    context.fillStyle = '#667085'
    context.font = '22px Arial'
    context.fillText(scopeLabel, 70, 110)

    const kpis = [
      ['Заявки', metrics.applications.toLocaleString('ru-RU')],
      ['Обучающиеся', metrics.students.toLocaleString('ru-RU')],
      ['Средний спрос', pct(metrics.averageDemand)],
      ['Прогресс', pct(metrics.averageProgress)],
    ]
    kpis.forEach(([label, value], index) => {
      const x = 70 + index * 315
      context.fillStyle = '#f9fafb'
      context.fillRect(x, 145, 285, 115)
      context.fillStyle = '#667085'
      context.font = '18px Arial'
      context.fillText(label, x + 20, 182)
      context.fillStyle = '#101828'
      context.font = 'bold 31px Arial'
      context.fillText(value, x + 20, 230)
    })

    context.fillStyle = '#101828'
    context.font = 'bold 27px Arial'
    context.fillText('Лидеры по востребованности', 70, 320)
    topPrograms.forEach((program, index) => {
      const y = 370 + index * 76
      const demand = Math.max(0, Math.min(100, program.demand))
      context.fillStyle = '#344054'
      context.font = 'bold 19px Arial'
      context.fillText(`${index + 1}. ${program.name}`.slice(0, 58), 70, y)
      context.fillStyle = '#98a2b3'
      context.font = '16px Arial'
      context.fillText(`${program.direction || 'Без направления'} · ${program.product}`.slice(0, 75), 70, y + 25)
      context.fillStyle = '#eaecf0'
      context.fillRect(760, y - 18, 430, 18)
      context.fillStyle = '#f04438'
      context.fillRect(760, y - 18, demand / 100 * 430, 18)
      context.fillStyle = '#344054'
      context.font = 'bold 18px Arial'
      context.fillText(`${Math.round(demand)}%`, 1210, y - 3)
    })

    canvas.toBlob(blob => {
      if (!blob) return setExportMessage('Не удалось сформировать PNG.')
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `rtk-analytics-${new Date().toISOString().slice(0, 10)}.png`
      link.click()
      URL.revokeObjectURL(url)
      setExportMessage('PNG с аналитикой сформирован.')
    }, 'image/png')
  }

  async function exportPdf() {
    if (!topPrograms.length) return setExportMessage('В выбранном срезе нет данных для экспорта.')
    setExportMessage('Формируем PDF…')
    const [{ default: pdfMake }, { default: pdfFonts }] = await Promise.all([
      import('pdfmake/build/pdfmake'),
      import('pdfmake/build/vfs_fonts'),
    ])
    ;(pdfMake as typeof pdfMake & { vfs: Record<string, string> }).vfs = pdfFonts as unknown as Record<string, string>
    const definition: TDocumentDefinitions = {
      pageSize: 'A4',
      pageOrientation: 'landscape',
      content: [
        { text: 'RTK Education CRM — аналитика', bold: true, fontSize: 18 },
        { text: `${scopeLabel} · сформировано ${new Date().toLocaleString('ru-RU')}`, color: '#667085', fontSize: 9, margin: [0, 4, 0, 14] },
        { columns: [
          { text: `Заявки\n${metrics.applications.toLocaleString('ru-RU')}`, bold: true },
          { text: `Обучающиеся\n${metrics.students.toLocaleString('ru-RU')}`, bold: true },
          { text: `Средний спрос\n${pct(metrics.averageDemand)}`, bold: true },
          { text: `Прогресс\n${pct(metrics.averageProgress)}`, bold: true },
        ], margin: [0, 0, 0, 18] },
        { svg: demandChartSvg(topPrograms), width: 690 },
      ],
      defaultStyle: { font: 'Roboto', fontSize: 10 },
    }
    pdfMake.createPdf(definition).download(`rtk-analytics-${new Date().toISOString().slice(0, 10)}.pdf`)
    setExportMessage('PDF с диаграммой сформирован.')
  }

  return <div className="content analytics-workspace">
    <div className="page-heading analytics-heading">
      <div>
        <div className="eyebrow">АНАЛИТИКА И РЕЙТИНГ</div>
        <h1>Аналитика</h1>
        <p className="muted">Сводная картина по спросу, программам, этапам и операционным рискам</p>
      </div>
      <div className="analytics-heading-actions">
        <label className="analytics-scope">Срез
          <select value={universityId} onChange={(event: ChangeEvent<HTMLSelectElement>) => { setUniversityId(event.target.value === 'all' ? 'all' : Number(event.target.value)); setExportMessage('') }}>
            <option value="all">Все вузы</option>
            {universities.map(university => <option value={university.id} key={university.id}>{university.shortName} · {university.city}</option>)}
          </select>
        </label>
        <div className="analytics-export-actions"><button className="outline-button" onClick={exportPng}>Скачать PNG</button><button className="outline-button" onClick={() => void exportPdf()}>Скачать PDF</button></div>
        {exportMessage && <small className="analytics-export-message" role="status">{exportMessage}</small>}
      </div>
    </div>

    <section className="analytics-kpis" aria-label="Ключевые показатели">
      <AnalyticsKpi label="Заявки" value={metrics.applications.toLocaleString('ru-RU')} detail={`${scopedPrograms.length} программ`} icon="book" />
      <AnalyticsKpi label="Обучающиеся" value={metrics.students.toLocaleString('ru-RU')} detail={`${metrics.streams} потоков`} icon="users" />
      <AnalyticsKpi label="Средний спрос" value={pct(metrics.averageDemand)} detail="по программам" icon="chart" />
      <AnalyticsKpi label="Прогресс взаимодействия" value={pct(metrics.averageProgress)} detail={`${scopedUniversities.length} вузов в срезе`} icon="check" />
    </section>

    <div className="analytics-layout-main">
      <section className="card analytics-panel analytics-demand-panel">
        <div className="card-header"><div><h2>Лидеры по востребованности</h2><p>Программы с самым высоким индексом спроса</p></div><span className="analytics-count">TOP {topPrograms.length}</span></div>
        <div className="analytics-ranking">
          {topPrograms.map((program, index) => <button key={program.id} className="analytics-rank-row" onClick={() => onOpenUniversity(program.universityId, program.id)}>
            <span className="analytics-rank-number">{index + 1}</span>
            <span className="analytics-rank-copy"><strong>{program.name}</strong><small>{program.product} · {program.applications.toLocaleString('ru-RU')} заявок</small></span>
            <span className="analytics-rank-bar"><i style={{ width: `${program.demand}%` }} /></span>
            <b>{program.demand}%</b>
          </button>)}
          {!topPrograms.length && <p className="empty-state">В выбранном срезе пока нет программ.</p>}
        </div>
      </section>

      <section className="card analytics-panel analytics-risk-panel">
        <div className="card-header"><div><h2>Контроль рисков</h2><p>Что требует внимания менеджера</p></div></div>
        <div className="analytics-risk-list">
          <RiskCard value={risks.overdue.length} label="Просроченные задачи" tone={risks.overdue.length ? 'danger' : 'ok'} onClick={onOpenTasks} />
          <RiskCard value={risks.blocked.length} label="Заблокированные этапы" tone={risks.blocked.length ? 'warning' : 'ok'} />
          <RiskCard value={risks.rejected.length} label="Документы с правками" tone={risks.rejected.length ? 'warning' : 'ok'} onClick={onOpenDocuments} />
          <RiskCard value={risks.lowProgress.length} label="Вузы с прогрессом < 25%" tone={risks.lowProgress.length ? 'warning' : 'ok'} />
        </div>
        <div className="analytics-risk-summary">
          {risks.overdue.length + risks.blocked.length + risks.rejected.length + risks.lowProgress.length === 0
            ? <><span className="analytics-ok-dot" /><div><strong>Критичных сигналов нет</strong><p>Текущий срез не содержит явных операционных рисков.</p></div></>
            : <><span className="analytics-warning-dot" /><div><strong>Есть точки контроля</strong><p>Откройте соответствующие разделы и проверьте просрочки, этапы и документы.</p></div></>}
        </div>
      </section>
    </div>

    <section className="card analytics-panel analytics-funnel-panel">
      <div className="card-header"><div><h2>Воронка 14 этапов</h2><p>Сколько программ уже дошло до каждого этапа взаимодействия</p></div><span className="analytics-count">{scopedPrograms.length} программ</span></div>
      <div className="analytics-funnel">
        {funnel.map(stage => <div className="analytics-funnel-item" key={stage.order} title={`${stage.order}. ${stage.title}: ${stage.reached} программ`}>
          <span>{stage.order}</span>
          <div className="analytics-funnel-track"><i style={{ height: `${Math.max(8, stage.reached / maxFunnel * 100)}%` }} /></div>
          <strong>{stage.reached}</strong>
          <small>{stage.title}</small>
        </div>)}
      </div>
    </section>

    <div className="analytics-layout-lower">
      <section className="card analytics-panel">
        <div className="card-header"><div><h2>Состояние workflow</h2><p>Все этапы программ в выбранном срезе</p></div></div>
        <div className="workflow-state-chart" aria-label="Распределение статусов этапов">
          <WorkflowState label="Выполнено" value={workflowStats.counts.done} total={workflowStats.total} kind="done" />
          <WorkflowState label="В процессе" value={workflowStats.counts.active} total={workflowStats.total} kind="active" />
          <WorkflowState label="Требует внимания" value={workflowStats.counts.blocked} total={workflowStats.total} kind="blocked" />
          <WorkflowState label="Предстоит" value={workflowStats.counts.pending} total={workflowStats.total} kind="pending" />
        </div>
      </section>

      <section className="card analytics-panel">
        <div className="card-header"><div><h2>ИТ-продукты</h2><p>Спрос и охват образовательных направлений</p></div></div>
        <div className="product-analytics-list">
          {productStats.map(item => <div className="product-analytics-row" key={item.product}>
            <div><strong>{item.product}</strong><span>{item.programs} прогр. · {item.students.toLocaleString('ru-RU')} обуч.</span></div>
            <div className="product-analytics-demand"><span><i style={{ width: `${item.demand}%` }} /></span><b>{pct(item.demand)}</b></div>
          </div>)}
          {!productStats.length && <p className="empty-state">Нет данных по продуктам.</p>}
        </div>
      </section>
    </div>

    <section className="card analytics-panel analytics-universities-panel">
      <div className="card-header"><div><h2>Сравнение вузов</h2><p>Прогресс взаимодействия и средняя востребованность программ</p></div></div>
      <div className="analytics-university-table">
        <div className="analytics-university-head"><span>Вуз</span><span>Прогресс</span><span>Средний спрос</span><span>Открытые задачи</span></div>
        {universityRows.map(({ university, averageDemand, openTasks }) => <button key={university.id} className="analytics-university-row" onClick={() => onOpenUniversity(university.id)}>
          <span><strong>{university.shortName}</strong><small>{university.city}</small></span>
          <span className="analytics-table-progress"><i><b style={{ width: `${university.progress}%` }} /></i><strong>{university.progress}%</strong></span>
          <span>{pct(averageDemand)}</span>
          <span className={openTasks ? 'analytics-task-badge' : 'analytics-task-badge clear'}>{openTasks}</span>
        </button>)}
      </div>
    </section>
  </div>
}

function AnalyticsKpi({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: 'book' | 'users' | 'chart' | 'check' }) {
  return <article className="card analytics-kpi"><div className="analytics-kpi-top"><span>{label}</span><span className="analytics-kpi-icon"><Icon name={icon} size={18} /></span></div><strong>{value}</strong><small>{detail}</small></article>
}

function RiskCard({ value, label, tone, onClick }: { value: number; label: string; tone: 'danger' | 'warning' | 'ok'; onClick?: () => void }) {
  const content = <><strong>{value}</strong><span>{label}</span><small>{value ? 'Требует проверки' : 'В норме'}</small></>
  return onClick
    ? <button className={`analytics-risk-card ${tone}`} onClick={onClick}>{content}</button>
    : <div className={`analytics-risk-card ${tone}`}>{content}</div>
}

function WorkflowState({ label, value, total, kind }: { label: string; value: number; total: number; kind: 'done' | 'active' | 'blocked' | 'pending' }) {
  const share = total ? value / total * 100 : 0
  return <div className="workflow-state-row"><div><span className={`workflow-state-dot ${kind}`} /><strong>{label}</strong><small>{value} этапов</small></div><div className="workflow-state-progress"><span><i className={kind} style={{ width: `${share}%` }} /></span><b>{pct(share)}</b></div></div>
}
