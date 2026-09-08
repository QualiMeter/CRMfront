import './styles.css'
import { useEffect, useState, type ReactNode } from 'react'
import { api } from './api'
import type { UniversityDetails } from './api/client'
import { AppShell } from './components/AppShell'
import { UniversitiesPage } from './pages/UniversitiesPage'
import { UniversityDetailsPage } from './pages/UniversityDetailsPage'
import { TasksPanel } from './components/TasksPanel'
import { SectionPage } from './pages/SectionPage'
import type { CrmTask, TaskInput, TaskUpdate, University, WorkflowStageUpdate } from './types/domain'

const currentLocation = () => window.location.pathname + window.location.search

function App() {
  const [location, setLocation] = useState(currentLocation)
  const [universities, setUniversities] = useState<University[]>([])
  const [details, setDetails] = useState<UniversityDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [tasks, setTasks] = useState<CrmTask[]>([])
  const [allPrograms, setAllPrograms] = useState<UniversityDetails['programs']>([])
  const [allActivities, setAllActivities] = useState<UniversityDetails['activities']>([])
  const url = new URL(location, window.location.origin)
  const path = url.pathname
  const programId = url.searchParams.has('program') ? Number(url.searchParams.get('program')) : null

  const navigate = (nextPath: string) => {
    window.history.pushState({}, '', nextPath)
    setLocation(currentLocation())
  }
  useEffect(() => {
    const onPopState = () => setLocation(currentLocation())
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    setDetails(null)
    async function load() {
      try {
        const [list, taskList] = await Promise.all([api.getUniversities(), api.getTasks()])
        if (cancelled) return
        setUniversities(list)
        setTasks(taskList)
        if (path.startsWith('/universities/')) {
          const data = await api.getUniversity(Number(path.split('/')[2]))
          if (!cancelled) setDetails(data)
        } else if (['/programs', '/analytics', '/tasks', '/documents'].includes(path)) {
          const detailsList = await Promise.all(list.map(university => api.getUniversity(university.id)))
          if (!cancelled) {
            setAllPrograms(detailsList.flatMap(data => data.programs))
            setAllActivities(detailsList.flatMap(data => data.activities))
          }
        }
      } catch (error) {
        if (!cancelled) setError(error instanceof Error ? error.message : 'Не удалось загрузить данные')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [path, retry])

  async function saveStage(programId: number, stageId: number, update: WorkflowStageUpdate) {
    if (!details) throw new Error('Откройте карточку вуза заново')
    const universityId = details.university.id
    const updated = await api.updateProgramStage(universityId, programId, stageId, update)
    // A completed save must not replace another university after navigation.
    setDetails(current => current?.university.id === universityId ? updated : current)
    setUniversities(current => current.map(university => university.id === universityId ? updated.university : university))
  }

  async function refreshTaskViews(task: CrmTask) {
    const [taskList, updated] = await Promise.all([api.getTasks(), api.getUniversity(task.universityId)])
    setTasks(taskList)
    setDetails(current => current?.university.id === updated.university.id ? updated : current)
  }
  async function createTask(input: TaskInput) { await refreshTaskViews(await api.createTask(input)) }
  async function updateTask(id: number, update: TaskUpdate) { await refreshTaskViews(await api.updateTask(id, update)) }

  let content: ReactNode
  if (loading) content = <div className="content"><div className="loading card" role="status">Загрузка данных…</div></div>
  else if (error) content = <div className="content"><div className="loading card"><p role="alert">{error}</p><button className="outline-button" onClick={() => setRetry(value => value + 1)}>Повторить загрузку</button></div></div>
  else if (path === '/' || path === '/universities') content = <UniversitiesPage universities={universities} onOpen={id => navigate(`/universities/${id}`)} />
  else if (path.startsWith('/universities/')) content = details ? <UniversityDetailsPage key={details.university.id} data={details} universities={universities} programId={programId} onSwitch={id => navigate(`/universities/${id}`)} onSelectProgram={id => navigate(`${path}?program=${id}`)} onSaveStage={saveStage} onCreateTask={createTask} onUpdateTask={updateTask} /> : <div className="content"><div className="loading card">Вуз не найден.</div></div>
  else if (path === '/tasks') content = <div className="content"><div className="page-heading"><div><div className="eyebrow">РАБОЧИЙ ЦЕНТР</div><h1>Задачи</h1><p className="muted">Поручения по всем учебным заведениям и программам</p></div></div><TasksPanel tasks={tasks} universities={universities} programs={allPrograms} onCreate={createTask} onUpdate={updateTask} onOpenUniversity={(id, selectedProgramId) => navigate(`/universities/${id}${selectedProgramId ? `?program=${selectedProgramId}` : ''}`)} /></div>
  else if (['/programs', '/analytics', '/documents'].includes(path)) content = <SectionPage key={path} section={path.slice(1) as 'programs' | 'analytics' | 'tasks' | 'documents'} programs={allPrograms} activities={allActivities} onOpenUniversity={(id, selectedProgramId) => navigate(`/universities/${id}${selectedProgramId ? `?program=${selectedProgramId}` : ''}`)} />
  else content = <div className="content"><div className="loading card">Раздел не найден.</div></div>

  return <AppShell taskCount={tasks.filter(task => task.status === 'open').length} path={path} navigate={navigate}>{content}</AppShell>
}

export default App
