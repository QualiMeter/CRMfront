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
import { IntegrationsPage } from './pages/IntegrationsPage'
import { ApprovalsPage } from './pages/ApprovalsPage'
import { WorkflowsPage } from './pages/WorkflowsPage'
import { UsersPage } from './pages/UsersPage'
import { AuthPage } from './pages/AuthPage'
import {
  AcademicDocumentsPage,
  AcademicProfilePage,
  AcademicProgramsPage,
  PendingRolePage,
  StudentOverviewPage,
  TeacherOverviewPage,
  TeacherStudentsPage,
} from './pages/AcademicPortalPages'
import { getSession, logout, refreshCurrentSession, syncCurrentUser, type AuthSession } from './api/auth'
import { createApprovalId, loadWorkflowApprovals, saveWorkflowApprovals } from './domain/approvals'
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
  WorkflowApprovalRequest,
  WorkflowTemplate,
  WorkflowTemplateInput,
  CrmUser,
  CrmUserInput,
  CrmUserUpdate,
  InvitationLink,
  ItDirection,
  StudentProfile,
  StudentProfileInput,
  TeacherProfile,
  TeacherProfileInput,
} from './types/domain'
import './portal.css'

const currentLocation = () => window.location.pathname + window.location.search

function primaryRole(roles: string[]) {
  return roles.includes('admin') ? 'admin' : roles.includes('leader') ? 'leader' : roles.includes('manager') ? 'manager' : roles.includes('teacher') ? 'teacher' : roles.includes('student') ? 'student' : 'user'
}

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
  const [directions, setDirections] = useState<ItDirection[]>([])
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null)
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null)
  const [students, setStudents] = useState<StudentProfile[]>([])
  const [approvalRequests, setApprovalRequests] = useState<WorkflowApprovalRequest[]>(() => loadWorkflowApprovals())
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
    if (!session || primaryRole(session.user.roles) !== 'user') return
    const checkRole = () => { if (document.visibilityState === 'visible') void refreshCurrentSession().catch(() => undefined) }
    const interval = window.setInterval(checkRole, 30_000)
    window.addEventListener('focus', checkRole)
    return () => { window.clearInterval(interval); window.removeEventListener('focus', checkRole) }
  }, [session?.user.id, session?.user.roles])

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
        const activeRole = primaryRole(authenticatedUser.roles)
        const canUseCrm = activeRole === 'admin' || activeRole === 'leader' || activeRole === 'manager'
        const canManageUsers = activeRole === 'admin' || activeRole === 'leader'
        const canManageContent = activeRole === 'admin' || activeRole === 'leader'
        if (activeRole === 'student' || activeRole === 'teacher') {
          const profile = activeRole === 'student'
            ? await api.getMyStudentProfile().catch(() => ({ userId: authenticatedUser.id, email: authenticatedUser.email, fullName: authenticatedUser.full_name, status: 'active' } as StudentProfile))
            : await api.getMyTeacherProfile().catch(() => ({ userId: authenticatedUser.id, email: authenticatedUser.email, fullName: authenticatedUser.full_name, status: 'active' } as TeacherProfile))
          const [list, documentList, studentList] = await Promise.all([
            api.getUniversities().catch(() => []),
            activeRole === 'student' && ['/', '/documents'].includes(path) ? api.getDocuments().catch(() => []) : Promise.resolve([]),
            activeRole === 'teacher' && ['/', '/students'].includes(path) ? api.getStudents().catch(() => []) : Promise.resolve([]),
          ])
          const detailsList = await Promise.all(list.map(university => api.getUniversity(university.id).catch(() => null)))
          if (cancelled) return
          const assignedUniversityId = profile.universityId ?? (list.length === 1 ? list[0].id : undefined)
          setUniversities(list)
          setDocuments(documentList)
          setStudents(studentList)
          setAllPrograms(detailsList.flatMap(data => data?.programs ?? []))
          setAllActivities([])
          if (activeRole === 'student') setStudentProfile({ ...(profile as StudentProfile), universityId: assignedUniversityId })
          else setTeacherProfile({ ...(profile as TeacherProfile), universityId: assignedUniversityId })
          return
        }
        if (activeRole === 'user') return
        // The profile is entirely backed by /auth/me and must not be blocked by
        // an unrelated operational endpoint timing out.
        if (path === '/profile') return

        const needsTasks = ['/', '/tasks', '/analytics'].includes(path)
        const needsDocuments = ['/documents', '/analytics'].includes(path)
        const needsTemplates = path === '/workflows' && canManageContent
        const needsUsers = path === '/users' && canManageUsers
        const [list, directionList, taskList, documentList, templates, userList] = await Promise.all([
          api.getUniversities(),
          api.getItDirections().catch(() => []),
          needsTasks ? api.getTasks() : Promise.resolve([]),
          needsDocuments ? api.getDocuments() : Promise.resolve([]),
          needsTemplates ? api.getWorkflowTemplates() : Promise.resolve([]),
          needsUsers ? api.getUsers() : Promise.resolve([]),
        ])
        if (cancelled) return
        setUniversities(list)
        setDirections(directionList)
        setTasks(taskList)
        setDocuments(documentList)
        setWorkflowTemplates(templates)
        setUsers(userList)
        if (path.startsWith('/universities/')) {
          const data = await api.getUniversity(Number(path.split('/')[2]))
          if (!cancelled) setDetails(data)
        } else if (path === '/' || ['/programs', '/analytics', '/reports', '/workflows', '/tasks', '/documents'].includes(path)) {
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

  if (!session) return <AuthPage onAuthenticated={nextSession => { setLocation(currentLocation()); setSession(nextSession) }} />
  const activeRole = primaryRole(session.user.roles)
  const canUseCrm = activeRole === 'admin' || activeRole === 'leader' || activeRole === 'manager'
  const canManageContent = activeRole === 'admin' || activeRole === 'leader'
  const canManageUsers = activeRole === 'admin' || activeRole === 'leader'
  const leaderMode = activeRole === 'leader'

  function changeApprovalRequests(update: (current: WorkflowApprovalRequest[]) => WorkflowApprovalRequest[]) {
    setApprovalRequests(current => {
      const next = update(current)
      saveWorkflowApprovals(next)
      return next
    })
  }

  async function saveStage(programId: number, stageId: number, update: WorkflowStageUpdate): Promise<string | void> {
    if (!details) throw new Error('Откройте карточку вуза заново')
    const universityId = details.university.id
    const program = details.programs.find(item => item.id === programId)
    const stage = program?.workflow.find(item => item.id === stageId)
    if (!program || !stage) throw new Error('Этап программы не найден')

    if (activeRole !== 'admin' && update.status !== stage.status) {
      const updated = await api.updateProgramStage(universityId, programId, stageId, { ...update, status: stage.status })
      setDetails(current => current?.university.id === universityId ? updated : current)
      setUniversities(current => current.map(university => university.id === universityId ? updated.university : university))
      const request: WorkflowApprovalRequest = {
        id: createApprovalId(),
        universityId,
        universityName: details.university.name,
        programId,
        programName: program.name,
        stageId,
        stageTitle: stage.title,
        fromStatus: stage.status,
        toStatus: update.status,
        update,
        requestedById: session.user.id,
        requestedByName: session.user.full_name || session.user.username,
        requestedAt: new Date().toISOString(),
        status: 'pending',
      }
      changeApprovalRequests(current => [
        request,
        ...current.filter(item => !(item.status === 'pending' && item.stageId === stageId && item.requestedById === session.user.id)),
      ])
      return 'Данные этапа сохранены. Смена статуса отправлена администратору на согласование.'
    }

    const updated = await api.updateProgramStage(universityId, programId, stageId, update)
    setDetails(current => current?.university.id === universityId ? updated : current)
    setUniversities(current => current.map(university => university.id === universityId ? updated.university : university))
    return activeRole === 'admin' && update.status !== stage.status ? 'Статус изменён с подтверждением администратора.' : undefined
  }

  async function approveWorkflowRequest(id: string, reviewComment?: string) {
    if (activeRole !== 'admin') throw new Error('Подтверждать смену статуса может только администратор')
    const request = approvalRequests.find(item => item.id === id && item.status === 'pending')
    if (!request) throw new Error('Запрос уже обработан или не найден')
    await api.updateProgramStage(request.universityId, request.programId, request.stageId, request.update)
    changeApprovalRequests(current => current.map(item => item.id === id ? {
      ...item,
      status: 'approved',
      reviewedByName: session.user.full_name || session.user.username,
      reviewedAt: new Date().toISOString(),
      reviewComment,
    } : item))
    setUniversities(await api.getUniversities())
  }

  async function rejectWorkflowRequest(id: string, reviewComment?: string) {
    if (activeRole !== 'admin') throw new Error('Отклонять смену статуса может только администратор')
    const request = approvalRequests.find(item => item.id === id && item.status === 'pending')
    if (!request) throw new Error('Запрос уже обработан или не найден')
    changeApprovalRequests(current => current.map(item => item.id === id ? {
      ...item,
      status: 'rejected',
      reviewedByName: session.user.full_name || session.user.username,
      reviewedAt: new Date().toISOString(),
      reviewComment,
    } : item))
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
  async function createUser(input: CrmUserInput): Promise<InvitationLink> {
    const created = await api.createUser(input)
    const invitation = await api.inviteUser(created.id)
    setUsers(await api.getUsers())
    return invitation
  }
  async function updateUser(id: number, update: CrmUserUpdate) { await api.updateUser(id, update); setUsers(await api.getUsers()) }
  async function inviteUser(id: number) { return api.inviteUser(id) }
  async function revokeUserInvite(id: number) { await api.revokeUserInvite(id); setUsers(await api.getUsers()) }
  async function saveStudentProfile(input: StudentProfileInput) { setStudentProfile(await api.updateMyStudentProfile(input)) }
  async function saveTeacherProfile(input: TeacherProfileInput) { setTeacherProfile(await api.updateMyTeacherProfile(input)) }

  let content: ReactNode
  if (loading) content = <div className="content"><div className="loading card" role="status">Загрузка данных…</div></div>
  else if (error) content = <div className="content"><div className="loading card"><p role="alert">{error}</p><button className="outline-button" onClick={() => setRetry(value => value + 1)}>Повторить загрузку</button></div></div>
  else if (activeRole === 'user') content = path === '/profile' ? <ProfilePage currentUser={session.user} onOpenSettings={() => setSettingsSignal(value => value + 1)} /> : <PendingRolePage user={session.user} onCheckRole={async () => primaryRole((await refreshCurrentSession())?.user.roles ?? []) !== 'user'} />
  else if (activeRole === 'student' && studentProfile) {
    const ownUniversity = universities.find(item => item.id === studentProfile.universityId)
    const ownProgram = allPrograms.find(item => item.id === studentProfile.programId)
    if (path === '/profile') content = <AcademicProfilePage role="student" profile={studentProfile} universities={universities} programs={allPrograms} onSave={saveStudentProfile} />
    else if (path === '/my-program' || path === '/programs') content = <AcademicProgramsPage title="Моя программа" programs={allPrograms} studentProgramId={studentProfile.programId} />
    else if (path === '/documents') content = <AcademicDocumentsPage documents={documents} programId={studentProfile.programId} />
    else content = <StudentOverviewPage profile={studentProfile} university={ownUniversity} program={ownProgram} documents={documents} navigate={navigate} />
  }
  else if (activeRole === 'teacher' && teacherProfile) {
    const ownUniversity = universities.find(item => item.id === teacherProfile.universityId)
    const ownPrograms = teacherProfile.universityId ? allPrograms.filter(item => item.universityId === teacherProfile.universityId) : allPrograms
    const ownStudents = teacherProfile.universityId ? students.filter(item => item.universityId === teacherProfile.universityId) : students
    if (path === '/profile') content = <AcademicProfilePage role="teacher" profile={teacherProfile} universities={universities} programs={ownPrograms} onSave={saveTeacherProfile} />
    else if (path === '/students') content = <TeacherStudentsPage students={ownStudents} universities={universities} programs={ownPrograms} />
    else if (path === '/programs') content = <AcademicProgramsPage title="Программы вуза" programs={ownPrograms} />
    else content = <TeacherOverviewPage profile={teacherProfile} university={ownUniversity} programs={ownPrograms} students={ownStudents} navigate={navigate} />
  }
  else if (path === '/') content = <OverviewPage universities={universities} programs={allPrograms} activities={allActivities} tasks={tasks} onOpenUniversity={id => navigate(`/universities/${id}`)} onOpenUniversities={() => navigate('/universities')} onOpenPrograms={() => navigate('/programs')} onOpenTasks={() => navigate('/tasks')} onOpenAnalytics={() => navigate('/analytics')} />
  else if (path === '/profile') content = <ProfilePage currentUser={session.user} onOpenSettings={() => setSettingsSignal(value => value + 1)} />
  else if (path === '/universities') content = <UniversitiesPage universities={universities} canCreate={canUseCrm} initialQuery={url.searchParams.get('search') ?? ''} onCreate={createUniversity} onOpen={id => navigate(`/universities/${id}`)} />
  else if (path.startsWith('/universities/')) content = details ? <UniversityDetailsPage key={details.university.id} data={details} universities={universities} programId={programId} onSwitch={id => navigate(`/universities/${id}`)} onSelectProgram={id => navigate(`${path}?program=${id}`)} onSaveStage={saveStage} onUploadStageAttachment={uploadStageAttachment} onDeleteStageAttachment={deleteStageAttachment} onCreateTask={createTask} onUpdateTask={updateTask} onOpenPrograms={() => navigate('/programs')} requiresStatusApproval={activeRole !== 'admin'} currentUserName={session.user.full_name || session.user.username} /> : <div className="content"><div className="loading card">Вуз не найден.</div></div>
  else if (path === '/tasks') content = <div className="content"><div className="page-heading"><div><div className="eyebrow">РАБОЧИЙ ЦЕНТР</div><h1>Задачи</h1><p className="muted">Поручения по всем учебным заведениям и программам</p></div></div><TasksPanel tasks={tasks} universities={universities} programs={allPrograms} onCreate={createTask} onUpdate={updateTask} onOpenUniversity={(id, selectedProgramId) => navigate(`/universities/${id}${selectedProgramId ? `?program=${selectedProgramId}` : ''}`)} /></div>
  else if (path === '/documents') content = <DocumentsPage documents={documents} programs={allPrograms} universities={universities} onCreate={createDocument} onUpdate={updateDocument} onDelete={deleteDocument} onOpenUniversity={(id, selectedProgramId) => navigate(`/universities/${id}${selectedProgramId ? `?program=${selectedProgramId}` : ''}`)} />
  else if (path === '/analytics') content = <AnalyticsPage universities={universities} programs={allPrograms} tasks={tasks} documents={documents} onOpenUniversity={(id, selectedProgramId) => navigate(`/universities/${id}${selectedProgramId ? `?program=${selectedProgramId}` : ''}`)} onOpenTasks={() => navigate('/tasks')} onOpenDocuments={() => navigate('/documents')} />
  else if (path === '/reports') content = <ReportsPage universities={universities} programs={allPrograms} onOpenUniversity={(id, selectedProgramId) => navigate(`/universities/${id}${selectedProgramId ? `?program=${selectedProgramId}` : ''}`)} />
  else if (path === '/integrations') content = canUseCrm ? <IntegrationsPage /> : <div className="content"><div className="loading card"><p role="alert">Интеграции доступны КАМам, руководителям и администраторам.</p></div></div>
  else if (path === '/approvals') content = canUseCrm ? <ApprovalsPage requests={activeRole === 'manager' ? approvalRequests.filter(item => item.requestedById === session.user.id) : approvalRequests} canReview={activeRole === 'admin'} currentUserName={session.user.full_name || session.user.username} onApprove={approveWorkflowRequest} onReject={rejectWorkflowRequest} onOpenUniversity={(id, selectedProgramId) => navigate(`/universities/${id}${selectedProgramId ? `?program=${selectedProgramId}` : ''}`)} /> : <div className="content"><div className="loading card"><p role="alert">Согласования доступны пользователям CRM.</p></div></div>
  else if (path === '/import') content = canUseCrm ? <ImportPage universities={universities} directions={directions} onImportUniversities={importUniversities} onImportPrograms={importPrograms} /> : <div className="content"><div className="loading card"><p role="alert">Импорт доступен КАМам, руководителям и администраторам.</p></div></div>
  else if (path === '/workflows') content = canManageContent ? <WorkflowsPage templates={workflowTemplates} universities={universities} programs={allPrograms} onCreate={createWorkflowTemplate} onUpdate={updateWorkflowTemplate} onDelete={deleteWorkflowTemplate} onApply={applyWorkflowTemplate} /> : <div className="content"><div className="loading card"><p role="alert">Управление шаблонами процессов доступно руководителям и администраторам.</p></div></div>
  else if (path === '/users') content = canManageUsers
    ? <UsersPage users={users} universities={universities} leaderMode={leaderMode} onCreate={createUser} onUpdate={updateUser} onInvite={inviteUser} onRevokeInvite={revokeUserInvite} />
    : <div className="content"><div className="loading card"><p role="alert">Управление пользователями доступно руководителям и администраторам.</p></div></div>
  else if (path === '/programs') content = <SectionPage section="programs" canCreate={canUseCrm} programs={allPrograms} universities={universities} directions={directions} onCreateProgram={createProgram} onOpenUniversity={(id, selectedProgramId) => navigate(`/universities/${id}${selectedProgramId ? `?program=${selectedProgramId}` : ''}`)} />
  else content = <div className="content"><div className="loading card">Раздел не найден.</div></div>

  const visibleApprovalCount = activeRole === 'manager'
    ? approvalRequests.filter(item => item.status === 'pending' && item.requestedById === session.user.id).length
    : approvalRequests.filter(item => item.status === 'pending').length

  return <AppShell currentUser={session.user} onLogout={async () => { await logout(); setSession(null) }} settingsSignal={settingsSignal} taskCount={tasks.filter(task => task.status === 'open').length} approvalCount={visibleApprovalCount} path={path} navigate={navigate}>{content}</AppShell>
}

export default App
