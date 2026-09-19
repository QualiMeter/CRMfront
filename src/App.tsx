import './styles.css'
import './interaction.css'
import { useEffect, useState, type ReactNode } from 'react'
import { api } from './api'
import type { UniversityDetails } from './api/client'
import { AppShell } from './components/AppShell'
import { OverviewPage } from './pages/OverviewPage'
import { UniversitiesPage } from './pages/UniversitiesPage'
import { UniversityDetailsPage } from './pages/UniversityDetailsPage'
import { TasksPanel } from './components/TasksPanel'
import { SectionPage } from './pages/SectionPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { DocumentsPage } from './pages/DocumentsPage'
import { ProfilePage } from './pages/ProfilePage'
import { ReportsPage } from './pages/ReportsPage'
import { ImportPage } from './pages/ImportPage'
import { WorkflowsPage } from './pages/WorkflowsPage'
import { UsersPage } from './pages/UsersPage'
import { AuthPage } from './pages/AuthPage'
import { getSession, logout, syncCurrentUser, type AuthSession } from './api/auth'
import type {
  CrmDocument,
  CrmTask,
  DocumentInput,
  DocumentUpdate,
  ProgramInput,
  TaskInput,
  TaskUpdate,
  University,
  UniversityInput,
  WorkflowStageUpdate,
  WorkflowTemplate,
  WorkflowTemplateInput,
  CrmUser,
  CrmUserInput,
  CrmUserUpdate,
} from './types/domain'

const currentLocation = () => window.location.pathname + window.location.search

function App() {
  const [session, setSession] = useState<AuthSession | null>(() => getSession())
  const [location, setLocation] = useState(currentLocation)
  const [universities, setUniversities] = useState<University[]>([])
  const [details, setDetails] = useState<UniversityDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [tasks, setTasks] = useState<CrmTask[]>([])
  const [documents, setDocuments] = useState<CrmDocument[]>([])
  const [allPrograms, setAllPrograms] = useState<UniversityDetails['programs']>([])
  const [allActivities, setAllActivities] = useState<UniversityDetails['activities']>([])
  const [settingsSignal, setSettingsSignal] = useState(0)
  const [workflowTemplates, setWorkflowTemplates] = useState<WorkflowTemplate[]>([])
  const [users, setUsers] = useState<CrmUser[]>([])
  const url = new URL(location, window.location.origin)
  const path = url.pathname
  const programId = url.searchParams.has('program') ? Number(url.searchParams.get('program')) : null

  const navigate = (nextPath: string) => {
    window.history.pushState({}, '', nextPath)
    setLocation(currentLocation())
  }
  useEffect(() => {
    const syncAuth = (event: Event) => setSession((event as CustomEvent<AuthSession | null>).detail ?? getSession())
    window.addEventListener('crm-auth-change', syncAuth)
    return () => window.removeEventListener('crm-auth-change', syncAuth)
  }, [])

  useEffect(() => {
    if (!session) return
    void syncCurrentUser().catch(() => undefined)
  }, [session?.accessToken])

  useEffect(() => {
    if (!session) return
    const onPopState = () => setLocation(currentLocation())
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    if (!session) return
    const authenticatedUser = session.user
    let cancelled = false
    setLoading(true)
    setError('')
    setDetails(null)
    async function load() {
      try {
        const canManageUsers = authenticatedUser.roles.includes('admin')
        const canManageContent = canManageUsers || authenticatedUser.roles.includes('manager')
        const [list, taskList, documentList, templates, userList] = await Promise.all([api.getUniversities(), api.getTasks(), api.getDocuments(), canManageContent ? api.getWorkflowTemplates() : Promise.resolve([]), canManageUsers ? api.getUsers() : Promise.resolve([])])
        if (cancelled) return
        setUniversities(list)
        setTasks(taskList)
        setDocuments(documentList)
        setWorkflowTemplates(templates)
        setUsers(userList)
        if (path.startsWith('/universities/')) {
          const data = await api.getUniversity(Number(path.split('/')[2]))
          if (!cancelled) setDetails(data)
        } else if (path === '/' || ['/programs', '/analytics', '/reports', '/import', '/workflows', '/tasks', '/documents'].includes(path)) {
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
  }, [path, retry, session])

  if (!session) return <AuthPage onAuthenticated={setSession} />
  const canManageContent = session.user.roles.includes('admin') || session.user.roles.includes('manager')

  async function saveStage(programId: number, stageId: number, update: WorkflowStageUpdate) {
    if (!details) throw new Error('Откройте карточку вуза заново')
    const universityId = details.university.id
    const updated = await api.updateProgramStage(universityId, programId, stageId, update)
    setDetails(current => current?.university.id === universityId ? updated : current)
    setUniversities(current => current.map(university => university.id === universityId ? updated.university : university))
  }

  async function uploadStageAttachment(programId: number, stageId: number, file: File) {
    if (!details) throw new Error('Откройте карточку вуза заново')
    const updated = await api.uploadStageAttachment(details.university.id, programId, stageId, file)
    setDetails(updated)
    setAllActivities(current => [...updated.activities, ...current.filter(activity => activity.universityId !== updated.university.id)])
  }

  async function deleteStageAttachment(programId: number, stageId: number, attachmentId: string) {
    if (!details) throw new Error('Откройте карточку вуза заново')
    const updated = await api.deleteStageAttachment(details.university.id, programId, stageId, attachmentId)
    setDetails(updated)
    setAllActivities(current => [...updated.activities, ...current.filter(activity => activity.universityId !== updated.university.id)])
  }

  async function refreshTaskViews(task: CrmTask) {
    const [taskList, updated] = await Promise.all([api.getTasks(), api.getUniversity(task.universityId)])
    setTasks(taskList)
    setDetails(current => current?.university.id === updated.university.id ? updated : current)
    setAllActivities(current => [...updated.activities, ...current.filter(activity => activity.universityId !== updated.university.id)])
  }
  async function createTask(input: TaskInput) { await refreshTaskViews(await api.createTask(input)) }
  async function updateTask(id: number, update: TaskUpdate) { await refreshTaskViews(await api.updateTask(id, update)) }

  async function refreshDocumentViews(document: CrmDocument) {
    const [documentList, updated] = await Promise.all([api.getDocuments(), api.getUniversity(document.universityId)])
    setDocuments(documentList)
    setDetails(current => current?.university.id === updated.university.id ? updated : current)
    setAllActivities(current => [...updated.activities, ...current.filter(activity => activity.universityId !== updated.university.id)])
  }
  async function createDocument(input: DocumentInput) { await refreshDocumentViews(await api.createDocument(input)) }
  async function updateDocument(id: number, update: DocumentUpdate) { await refreshDocumentViews(await api.updateDocument(id, update)) }
  async function deleteDocument(id: number) { await refreshDocumentViews(await api.deleteDocument(id)) }

  async function createUniversity(input: UniversityInput) {
    const created = await api.createUniversity(input)
    setUniversities(await api.getUniversities())
    return created.university.id
  }
  async function createProgram(input: ProgramInput) {
    const updated = await api.createProgram(input)
    setUniversities(await api.getUniversities())
    setAllPrograms(current => [...current.filter(program => program.universityId !== input.universityId), ...updated.programs])
    setAllActivities(current => [...updated.activities, ...current.filter(activity => activity.universityId !== input.universityId)])
    setDetails(current => current?.university.id === updated.university.id ? updated : current)
  }
  async function importUniversities(inputs: UniversityInput[]) {
    let count = 0
    for (const input of inputs) { await api.createUniversity(input); count += 1 }
    setUniversities(await api.getUniversities())
    return count
  }
  async function importPrograms(inputs: ProgramInput[]) {
    let count = 0
    for (const input of inputs) { await api.createProgram(input); count += 1 }
    const list = await api.getUniversities()
    const detailsList = await Promise.all(list.map(university => api.getUniversity(university.id)))
    setUniversities(list); setAllPrograms(detailsList.flatMap(data => data.programs)); setAllActivities(detailsList.flatMap(data => data.activities))
    return count
  }
  async function createWorkflowTemplate(input: WorkflowTemplateInput) {
    const created = await api.createWorkflowTemplate(input)
    setWorkflowTemplates(await api.getWorkflowTemplates())
    return created.id
  }
  async function updateWorkflowTemplate(id: number, input: WorkflowTemplateInput) {
    await api.updateWorkflowTemplate(id, input)
    setWorkflowTemplates(await api.getWorkflowTemplates())
  }
  async function deleteWorkflowTemplate(id: number) {
    await api.deleteWorkflowTemplate(id)
    setWorkflowTemplates(await api.getWorkflowTemplates())
  }
  async function applyWorkflowTemplate(universityId: number, programId: number, templateId: number) {
    const updated = await api.applyWorkflowTemplate(universityId, programId, templateId)
    setUniversities(await api.getUniversities())
    setAllPrograms(current => [...current.filter(program => program.universityId !== universityId), ...updated.programs])
    setAllActivities(current => [...updated.activities, ...current.filter(activity => activity.universityId !== universityId)])
  }
  async function createUser(input: CrmUserInput) { await api.createUser(input); setUsers(await api.getUsers()) }
  async function updateUser(id: number, update: CrmUserUpdate) { await api.updateUser(id, update); setUsers(await api.getUsers()) }

  let content: ReactNode
  if (loading) content = <div className="content"><div className="loading card" role="status">Загрузка данных…</div></div>
  else if (error) content = <div className="content"><div className="loading card"><p role="alert">{error}</p><button className="outline-button" onClick={() => setRetry(value => value + 1)}>Повторить загрузку</button></div></div>
  else if (path === '/') content = <OverviewPage universities={universities} programs={allPrograms} activities={allActivities} tasks={tasks} onOpenUniversity={id => navigate(`/universities/${id}`)} onOpenUniversities={() => navigate('/universities')} onOpenPrograms={() => navigate('/programs')} onOpenTasks={() => navigate('/tasks')} onOpenAnalytics={() => navigate('/analytics')} />
  else if (path === '/profile') content = <ProfilePage currentUser={session.user} onOpenSettings={() => setSettingsSignal(value => value + 1)} />
  else if (path === '/universities') content = <UniversitiesPage universities={universities} canCreate={canManageContent} initialQuery={url.searchParams.get('search') ?? ''} onCreate={createUniversity} onOpen={id => navigate(`/universities/${id}`)} />
  else if (path.startsWith('/universities/')) content = details ? <UniversityDetailsPage key={details.university.id} data={details} universities={universities} programId={programId} onSwitch={id => navigate(`/universities/${id}`)} onSelectProgram={id => navigate(`${path}?program=${id}`)} onSaveStage={saveStage} onUploadStageAttachment={uploadStageAttachment} onDeleteStageAttachment={deleteStageAttachment} onCreateTask={createTask} onUpdateTask={updateTask} onOpenPrograms={() => navigate('/programs')} /> : <div className="content"><div className="loading card">Вуз не найден.</div></div>
  else if (path === '/tasks') content = <div className="content"><div className="page-heading"><div><div className="eyebrow">РАБОЧИЙ ЦЕНТР</div><h1>Задачи</h1><p className="muted">Поручения по всем учебным заведениям и программам</p></div></div><TasksPanel tasks={tasks} universities={universities} programs={allPrograms} onCreate={createTask} onUpdate={updateTask} onOpenUniversity={(id, selectedProgramId) => navigate(`/universities/${id}${selectedProgramId ? `?program=${selectedProgramId}` : ''}`)} /></div>
  else if (path === '/documents') content = <DocumentsPage documents={documents} programs={allPrograms} universities={universities} onCreate={createDocument} onUpdate={updateDocument} onDelete={deleteDocument} onOpenUniversity={(id, selectedProgramId) => navigate(`/universities/${id}${selectedProgramId ? `?program=${selectedProgramId}` : ''}`)} />
  else if (path === '/analytics') content = <AnalyticsPage universities={universities} programs={allPrograms} tasks={tasks} documents={documents} onOpenUniversity={(id, selectedProgramId) => navigate(`/universities/${id}${selectedProgramId ? `?program=${selectedProgramId}` : ''}`)} onOpenTasks={() => navigate('/tasks')} onOpenDocuments={() => navigate('/documents')} />
  else if (path === '/reports') content = <ReportsPage universities={universities} programs={allPrograms} onOpenUniversity={(id, selectedProgramId) => navigate(`/universities/${id}${selectedProgramId ? `?program=${selectedProgramId}` : ''}`)} />
  else if (path === '/import') content = canManageContent ? <ImportPage universities={universities} onImportUniversities={importUniversities} onImportPrograms={importPrograms} /> : <div className="content"><div className="loading card"><p role="alert">Импорт доступен менеджерам и администраторам.</p></div></div>
  else if (path === '/workflows') content = canManageContent ? <WorkflowsPage templates={workflowTemplates} universities={universities} programs={allPrograms} onCreate={createWorkflowTemplate} onUpdate={updateWorkflowTemplate} onDelete={deleteWorkflowTemplate} onApply={applyWorkflowTemplate} /> : <div className="content"><div className="loading card"><p role="alert">Управление процессами доступно менеджерам и администраторам.</p></div></div>
  else if (path === '/users') content = session.user.roles.includes('admin')
    ? <UsersPage users={users} universities={universities} onCreate={createUser} onUpdate={updateUser} />
    : <div className="content"><div className="loading card"><p role="alert">Раздел доступен только администраторам.</p></div></div>
  else if (path === '/programs') content = <SectionPage section="programs" canCreate={canManageContent} programs={allPrograms} universities={universities} onCreateProgram={createProgram} onOpenUniversity={(id, selectedProgramId) => navigate(`/universities/${id}${selectedProgramId ? `?program=${selectedProgramId}` : ''}`)} />
  else content = <div className="content"><div className="loading card">Раздел не найден.</div></div>

  return <AppShell currentUser={session.user} onLogout={async () => { await logout(); setSession(null) }} settingsSignal={settingsSignal} taskCount={tasks.filter(task => task.status === 'open').length} path={path} navigate={navigate}>{content}</AppShell>
}

export default App
