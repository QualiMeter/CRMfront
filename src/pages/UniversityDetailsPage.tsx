import { useState } from 'react'
import { TasksPanel } from '../components/TasksPanel'
import { ProgramList } from '../components/ProgramList'
import { ProgramWorkflow } from '../components/ProgramWorkflow'
import { InteractionCard } from '../components/InteractionCard'
import { Icon } from '../components/Icon'
import type { UniversityDetails } from '../api/client'
import type { TaskInput, TaskUpdate, WorkflowStageUpdate } from '../types/domain'

export function UniversityDetailsPage({ data, universities, onSwitch, programId, onSelectProgram, onSaveStage, onUploadStageAttachment, onDeleteStageAttachment, onCreateTask, onUpdateTask, onOpenPrograms, requiresStatusApproval = false, currentUserName }: {
  onCreateTask: (input: TaskInput) => Promise<void>
  onUpdateTask: (id: number, update: TaskUpdate) => Promise<void>
  data: UniversityDetails
  universities: import('../types/domain').University[]
  onSwitch: (id: number) => void
  programId: number | null
  onSelectProgram: (id: number) => void
  onSaveStage: (programId: number, stageId: number, update: WorkflowStageUpdate) => Promise<string | void>
  onUploadStageAttachment: (programId: number, stageId: number, file: File) => Promise<void>
  onDeleteStageAttachment: (programId: number, stageId: number, attachmentId: string) => Promise<void>
  onOpenPrograms: () => void
  requiresStatusApproval?: boolean
  currentUserName: string
}) {
  const [createSignal, setCreateSignal] = useState(0)
  const [showAllActivities, setShowAllActivities] = useState(false)
  const { university, programs, activities } = data
  const selectedProgram = programs.find(program => program.id === programId) ?? programs[0]
  const visibleActivities = showAllActivities ? activities : activities.slice(0, 4)

  return <div className="content">
    <div className="page-heading"><div><div className="eyebrow">КАРТОЧКА УЧЕБНОГО ЗАВЕДЕНИЯ</div><div className="title-row"><h1>{university.name}</h1><span className="status-pill"><span />{university.status}</span></div><p className="muted">{university.city} · Контакт: {university.contactPerson} · {university.contactRole}</p></div><div className="heading-actions"><select aria-label="Учебное заведение" className="university-switcher" value={university.id} onChange={e => onSwitch(Number(e.target.value))}>{universities.map(u => <option key={u.id} value={u.id}>{u.shortName} · {u.city}</option>)}</select><button className="primary-button" onClick={() => setCreateSignal(value => value + 1)}><Icon name="plus" size={18} /> Добавить задачу</button></div></div>
    <section className="kpi-grid"><Kpi label="Программы" value={university.programsCount} detail={`${university.activePrograms} активных`} icon="book" /><Kpi label="Обучающиеся" value={university.students.toLocaleString('ru-RU')} detail="за текущий период" icon="users" /><Kpi label="Потоки" value={university.streams} detail="в работе" icon="calendar" /><Kpi label="Прогресс" value={`${university.progress}%`} detail="по этапам всех программ" icon="chart" progress={university.progress} /></section>
    <section className="card program-selector"><label htmlFor="program-select">Программа и ИТ-продукт</label>{selectedProgram ? <><select id="program-select" value={selectedProgram.id} onChange={event => onSelectProgram(Number(event.target.value))}>{programs.map(program => <option key={program.id} value={program.id}>{program.name} · {program.product}</option>)}</select><span>У каждой программы — собственные этапы взаимодействия</span></> : <p>У этого вуза пока нет программ.</p>}</section>
    {selectedProgram && <InteractionCard key={`interaction-${selectedProgram.id}`} university={university} program={selectedProgram} currentUserName={currentUserName} />}
    {selectedProgram && <ProgramWorkflow key={selectedProgram.id} program={selectedProgram} requiresStatusApproval={requiresStatusApproval} onSave={(stageId, update) => onSaveStage(selectedProgram.id, stageId, update)} onUpload={(stageId, file) => onUploadStageAttachment(selectedProgram.id, stageId, file)} onDeleteAttachment={(stageId, attachmentId) => onDeleteStageAttachment(selectedProgram.id, stageId, attachmentId)} />}
    <TasksPanel tasks={data.tasks} universities={universities} programs={programs} universityId={university.id} initialProgramId={selectedProgram?.id} createSignal={createSignal} onCreate={onCreateTask} onUpdate={onUpdateTask} />
    <div className="lower-grid"><section className="card programs-card"><div className="card-header"><div><h2>Образовательные программы</h2><p>Программы этого учебного заведения</p></div><button className="ghost-button" onClick={onOpenPrograms}>Все программы <Icon name="arrow" size={16} /></button></div><ProgramList programs={programs} selectedId={selectedProgram?.id} onSelect={program => onSelectProgram(program.id)} /></section>
      <section className="card activity-card"><div className="card-header"><div><h2>Активность</h2><p>Последние изменения</p></div>{activities.length > 4 && <button className="ghost-button" onClick={() => setShowAllActivities(value => !value)}>{showAllActivities ? 'Свернуть' : `Все (${activities.length})`} <Icon name="arrow" size={16} /></button>}</div><div className="activity-list">{visibleActivities.map((activity) => <div className="activity" key={activity.id}><div className={`activity-icon ${activity.type}`}><span /></div><div className="activity-body"><div className="activity-top"><strong>{activity.title}</strong><span>{activity.time}</span></div><p>{activity.description}</p></div></div>)}</div></section></div>
  </div>
}
function Kpi({ label, value, detail, icon, progress }: { label: string; value: string | number; detail: string; icon: 'book' | 'users' | 'calendar' | 'chart'; progress?: number }) { return <div className="kpi card"><div className="kpi-top"><span>{label}</span><div className="kpi-icon"><Icon name={icon} size={18} /></div></div><div className="kpi-value">{value}</div><div className="kpi-detail">{detail}</div>{progress !== undefined && <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>}</div> }
