import type { ApiClient, UniversityDetails } from './client'
import { authorizedFetch, getSession } from './auth'
import type {
  Activity,
  CrmDocument,
  CrmTask,
  DocumentInput,
  DocumentStatus,
  DocumentUpdate,
  Program,
  ProgramInput,
  StageStatus,
  StageAttachment,
  TaskInput,
  TaskUpdate,
  University,
  UniversityInput,
  WorkflowStage,
  WorkflowStageUpdate,
  WorkflowTemplate,
  CrmUser,
  CrmUserInput,
  CrmUserUpdate,
} from '../types/domain'

const API_URL = (import.meta.env.VITE_API_URL || 'https://crmbackend-hw.up.railway.app').replace(/\/$/, '')
const REQUEST_TIMEOUT = 35_000

type Row = Record<string, unknown>

const text = (value: unknown, fallback = '') => typeof value === 'string' ? value : fallback
const number = (value: unknown, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}
const nullableNumber = (value: unknown) => value == null ? undefined : number(value)
const dateOnly = (value: unknown) => text(value).slice(0, 10)

const universityStatus: Record<string, string> = {
  contact_search: 'Поиск контактов',
  communication: 'Коммуникация',
  implementation: 'Внедрение',
  active: 'Активное взаимодействие',
  paused: 'Приостановлено',
  completed: 'Завершено',
}

const universityStatusToApi: Record<string, string> = {
  'Контакт найден': 'contact_search',
  'Поиск контактов': 'contact_search',
  'Коммуникация': 'communication',
  'Внедрение': 'implementation',
  'Активное взаимодействие': 'active',
  'Приостановлено': 'paused',
  'Завершено': 'completed',
}

const stageStatusFromApi = (value: unknown): StageStatus => {
  if (value === 'done') return 'done'
  if (value === 'blocked') return 'blocked'
  if (value === 'in_progress') return 'active'
  return 'pending'
}

const stageStatusToApi = (value: StageStatus) => value === 'active' ? 'in_progress' : value

const documentStatusFromApi = (value: unknown): DocumentStatus => {
  if (value === 'approval') return 'review'
  if (value === 'approved') return 'approved'
  if (value === 'rejected') return 'rejected'
  return 'draft'
}

const documentStatusToApi = (value: DocumentStatus) => value === 'review' ? 'approval' : value
const defaultStatusLabels: Record<StageStatus, string> = { done: 'Выполнено', active: 'В процессе', pending: 'Предстоит', blocked: 'Требует внимания' }
const statusMarker = /\n\[crm-status-labels:([^\]]+)\]$/

function encodeTemplateDescription(description: string, labels: Record<StageStatus, string>) {
  return `${description.trim()}\n[crm-status-labels:${encodeURIComponent(JSON.stringify(labels))}]`
}

function decodeTemplateDescription(value: unknown) {
  const raw = text(value)
  const match = raw.match(statusMarker)
  if (!match) return { description: raw, labels: defaultStatusLabels }
  try { return { description: raw.replace(statusMarker, ''), labels: { ...defaultStatusLabels, ...JSON.parse(decodeURIComponent(match[1])) } } }
  catch { return { description: raw.replace(statusMarker, ''), labels: defaultStatusLabels } }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT)
  try {
    const response = await authorizedFetch(`${API_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    })
    if (!response.ok) {
      const body = await response.text()
      throw new Error(body || `Backend вернул ${response.status}`)
    }
    if (response.status === 204) return undefined as T
    return await response.json() as T
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Backend не ответил вовремя. Railway мог выходить из спящего режима.')
    }
    throw error
  } finally {
    window.clearTimeout(timeout)
  }
}

async function uploadFile<T>(path: string, file: File): Promise<T> {
  const form = new FormData()
  form.append('file', file)
  const response = await authorizedFetch(`${API_URL}${path}`, { method: 'POST', body: form })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.detail || data.message || `Backend вернул ${response.status}`)
  return data as T
}

async function table(name: string): Promise<Row[]> {
  return request<Row[]>(`/api/v1/${name.replaceAll('_', '-')}?limit=500`)
}

async function optionalTable(name: string): Promise<Row[]> {
  try { return await table(name) } catch { return [] }
}

function mapTask(row: Row, users: Row[]): CrmTask {
  const assignee = users.find(user => number(user.id) === number(row.assignee_id))
  return {
    id: number(row.id),
    universityId: number(row.university_id),
    programId: nullableNumber(row.program_id),
    title: text(row.title, 'Задача'),
    owner: text(assignee?.full_name, row.assignee_id ? `Пользователь #${number(row.assignee_id)}` : 'Не назначен'),
    dueDate: dateOnly(row.due_at),
    priority: row.priority === 'low' || row.priority === 'high' ? row.priority : 'normal',
    description: text(row.description),
    status: row.status === 'done' ? 'done' : 'open',
    createdAt: text(row.created_at),
  }
}

function mapDocument(row: Row, users: Row[]): CrmDocument {
  const owner = users.find(user => number(user.id) === number(row.owner_id))
  return {
    id: number(row.id),
    universityId: number(row.university_id),
    programId: nullableNumber(row.program_id),
    name: text(row.name, 'Документ'),
    category: ['agreement', 'program', 'license', 'methodology', 'protocol'].includes(text(row.category))
      ? text(row.category) as CrmDocument['category'] : 'other',
    owner: text(owner?.full_name, 'Не назначен'),
    status: documentStatusFromApi(row.status),
    size: '—',
    mimeType: 'application/octet-stream',
    note: text(row.comment),
    version: number(row.current_version),
    uploadedAt: text(row.created_at),
    updatedAt: text(row.updated_at),
  }
}

function mapWorkflowStage(row: Row, universityId: number, programId: number, attachments: StageAttachment[] = []): WorkflowStage {
  const due = dateOnly(row.due_at)
  return {
    id: number(row.id),
    universityId,
    programId,
    order: number(row.position),
    title: text(row.name, 'Этап'),
    shortTitle: text(row.name, 'Этап'),
    status: stageStatusFromApi(row.status),
    date: due || undefined,
    owner: row.responsible_user_id ? `Пользователь #${number(row.responsible_user_id)}` : undefined,
    note: text(row.comment) || undefined,
    attachments,
  }
}

async function getInteractions(universityId?: number): Promise<Row[]> {
  const rows = await request<Row[]>('/api/v1/interactions?limit=500')
  return universityId ? rows.filter(row => number(row.university_id) === universityId) : rows
}

async function loadStageAttachments(stageIds: number[], users: Row[]) {
  const links = (await optionalTable('stage_attachments')).filter(link => stageIds.includes(number(link.stage_instance_id)))
  const result = new Map<number, StageAttachment[]>()
  await Promise.all(links.map(async link => {
    const fileId = text(link.file_id)
    if (!fileId) return
    const file = await request<Row>(`/api/v1/files/${fileId}`)
    let url = '#'
    try {
      const response = await authorizedFetch(`${API_URL}/api/v1/files/${fileId}/download`)
      if (response.ok) url = URL.createObjectURL(await response.blob())
    } catch { /* Metadata remains visible even if the binary is temporarily unavailable. */ }
    const uploader = users.find(user => number(user.id) === number(file.uploaded_by))
    const stageId = number(link.stage_instance_id)
    const item: StageAttachment = {
      id: fileId,
      stageId,
      name: text(file.original_name, 'Файл'),
      size: number(file.size_bytes),
      mimeType: text(file.content_type, 'application/octet-stream'),
      uploadedAt: text(file.created_at, text(link.created_at)),
      uploadedBy: text(uploader?.full_name, 'Пользователь'),
      url,
    }
    result.set(stageId, [...(result.get(stageId) ?? []), item])
  }))
  return result
}

async function loadStageNotes(stageIds: number[]) {
  const result = new Map<number, string>()
  await Promise.all(stageIds.map(async stageId => {
    const comments = await request<Row[]>(`/api/v1/comments/stage/${stageId}`)
    const latest = comments.filter(comment => !comment.deleted_at)
      .sort((a, b) => text(b.created_at).localeCompare(text(a.created_at)))[0]
    if (latest) result.set(stageId, text(latest.body))
  }))
  return result
}

async function buildPrograms(universityId: number, rows: Row[], interactions: Row[], users: Row[]): Promise<Program[]> {
  const [products, links] = await Promise.all([optionalTable('it_products'), optionalTable('program_products')])
  return Promise.all(rows.map(async row => {
    const programId = number(row.id)
    const interaction = interactions.find(item => number(item.program_id) === programId)
    const workflowRows = interaction
      ? (await request<Row[]>('/api/v1/workflow-stage-instances?limit=500')).filter(stage => number(stage.interaction_id) === number(interaction.id))
      : []
    const productLink = links.find(link => number(link.program_id) === programId && Boolean(link.is_primary))
      ?? links.find(link => number(link.program_id) === programId)
    const product = products.find(item => number(item.id) === number(productLink?.product_id))
      ?? products.find(item => number(item.id) === number(interaction?.product_id))
    const stageIds = workflowRows.map(stage => number(stage.id))
    const [attachments, notes] = await Promise.all([loadStageAttachments(stageIds, users), loadStageNotes(stageIds)])
    const workflow = workflowRows.map(stage => ({
      ...mapWorkflowStage(stage, universityId, programId, attachments.get(number(stage.id))),
      note: notes.get(number(stage.id)),
    }))
    const currentStage = workflow.find(stage => stage.status === 'active')
      ?? workflow.find(stage => stage.status !== 'done')
    return {
      id: programId,
      universityId,
      name: text(row.name, 'Программа'),
      product: text(product?.name, text(product?.software_name, interaction ? text(interaction.name) : 'ИТ-продукт не указан')),
      students: number(row.students_count),
      streams: number(row.streams_count),
      applications: number(row.applications_count),
      demand: number(row.demand_score),
      stage: currentStage?.title ?? (workflow.length ? 'Все этапы завершены' : 'Workflow не создан'),
      workflow,
    }
  }))
}

function mapActivity(row: Row): Activity {
  const kind = text(row.kind).toLowerCase()
  return {
    id: number(row.id),
    universityId: number(row.university_id),
    time: text(row.created_at) ? new Date(text(row.created_at)).toLocaleString('ru-RU') : 'Недавно',
    title: text(row.title, 'Событие'),
    description: text(row.description),
    type: kind.includes('error') || kind.includes('block') ? 'warning' : kind.includes('complete') || kind.includes('done') ? 'success' : 'info',
  }
}

async function remoteUniversityDetails(id: number): Promise<UniversityDetails> {
  const [rawUniversity, contacts, programRows, interactions, taskRows, documentRows, activityRows, users] = await Promise.all([
    request<Row>(`/api/v1/universities/${id}`),
    request<Row[]>('/api/v1/university-contacts?limit=500').then(rows => rows.filter(row => number(row.university_id) === id)),
    request<Row[]>('/api/v1/programs?limit=500').then(rows => rows.filter(row => number(row.university_id) === id)),
    getInteractions(id),
    request<Row[]>('/api/v1/tasks?limit=500').then(rows => rows.filter(row => number(row.university_id) === id)),
    request<Row[]>('/api/v1/documents?limit=500').then(rows => rows.filter(row => number(row.university_id) === id)),
    request<Row[]>('/api/v1/activities?limit=500').then(rows => rows.filter(row => number(row.university_id) === id)),
    optionalTable('users'),
  ])
  const programs = await buildPrograms(id, programRows, interactions, users)
  const tasks = taskRows.map(row => mapTask(row, users))
  const documents = documentRows.map(row => mapDocument(row, users))
  const primaryContact = contacts.find(contact => Boolean(contact.is_primary)) ?? contacts[0]
  const allStages = programs.flatMap(program => program.workflow)
  const progress = allStages.length
    ? Math.round(allStages.filter(stage => stage.status === 'done').length * 100 / allStages.length)
    : 0
  const university: University = {
    id,
    name: text(rawUniversity.name, 'Учебное заведение'),
    shortName: text(rawUniversity.short_name, 'Вуз'),
    city: text(rawUniversity.city),
    contactPerson: text(primaryContact?.full_name, 'Не указан'),
    contactRole: text(primaryContact?.position, 'Контактное лицо'),
    status: universityStatus[text(rawUniversity.status)] ?? text(rawUniversity.status, 'Без статуса'),
    programsCount: programs.length,
    activePrograms: interactions.filter(item => item.status === 'active').length,
    students: programs.reduce((sum, program) => sum + program.students, 0),
    streams: programs.reduce((sum, program) => sum + program.streams, 0),
    progress,
  }
  return { university, programs, tasks, documents, activities: activityRows.map(mapActivity) }
}

async function remoteUniversities(): Promise<University[]> {
  const rows = await request<Row[]>('/api/v1/universities?limit=500')
  return Promise.all(rows.map(row => remoteUniversityDetails(number(row.id)).then(details => details.university)))
}

async function findUserId(name: string): Promise<number | null> {
  const users = await optionalTable('users')
  return nullableNumber(users.find(user => text(user.full_name).toLowerCase() === name.toLowerCase())?.id) ?? null
}

async function createRow<T extends Row>(name: string, payload: Row): Promise<T> {
  return request<T>(`/api/v1/${name.replaceAll('_', '-')}`, { method: 'POST', body: JSON.stringify(payload) })
}

async function patchRow<T extends Row>(name: string, id: number, payload: Row): Promise<T> {
  return request<T>(`/api/v1/${name.replaceAll('_', '-')}/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
}

const userRole = (roles: unknown): CrmUser['role'] => {
  const values = Array.isArray(roles) ? roles.map(String) : []
  return values.includes('admin') ? 'admin' : values.includes('manager') ? 'manager' : 'user'
}

async function mapUsers(rows: Row[]): Promise<CrmUser[]> {
  const access = await request<Row[]>('/api/v1/user-university-access?limit=500')
  return rows.map(row => ({
    id: number(row.id),
    name: text(row.full_name, text(row.email)),
    email: text(row.email),
    role: userRole(row.roles),
    status: ['active', 'invited', 'blocked'].includes(text(row.status)) ? text(row.status) as CrmUser['status'] : 'invited',
    universityIds: access.filter(item => number(item.user_id) === number(row.id)).map(item => number(item.university_id)),
    lastActive: text(row.last_login_at) || undefined,
  }))
}

async function syncUniversityAccess(userId: number, universityIds: number[], isManager: boolean) {
  const current = (await request<Row[]>('/api/v1/user-university-access?limit=500')).filter(item => number(item.user_id) === userId)
  const wanted = new Set(universityIds)
  await Promise.all(current.filter(item => !wanted.has(number(item.university_id))).map(item =>
    request<void>(`/api/v1/user-university-access/${userId}/${number(item.university_id)}`, { method: 'DELETE' })))
  const existing = new Set(current.map(item => number(item.university_id)))
  await Promise.all(current.filter(item => wanted.has(number(item.university_id)) && Boolean(item.is_manager) !== isManager).map(item =>
    request(`/api/v1/user-university-access/${userId}/${number(item.university_id)}`, { method: 'PATCH', body: JSON.stringify({ is_manager: isManager }) })))
  await Promise.all(universityIds.filter(id => !existing.has(id)).map(universityId => createRow('user_university_access', {
    user_id: userId, university_id: universityId, is_manager: isManager,
  })))
}

async function remoteWorkflowTemplates(): Promise<WorkflowTemplate[]> {
  const [templates, stages] = await Promise.all([
    request<Row[]>('/api/v1/workflow-templates?limit=500'),
    request<Row[]>('/api/v1/workflow-template-stages?limit=500'),
  ])
  return templates.map(template => {
    const decoded = decodeTemplateDescription(template.description)
    return {
    id: number(template.id),
    name: text(template.name, 'Процесс'),
    description: decoded.description,
    isSystem: Boolean(template.is_default),
    updatedAt: text(template.updated_at, text(template.created_at, new Date(0).toISOString())),
    stages: stages.filter(stage => number(stage.template_id) === number(template.id))
      .sort((a, b) => number(a.position) - number(b.position))
      .map(stage => ({ id: number(stage.id), order: number(stage.position), title: text(stage.name, 'Этап'), shortTitle: text(stage.code, text(stage.name, 'Этап')) })),
    statusLabels: decoded.labels,
  }})
}

export const httpApi: ApiClient = {
  async getUsers() {
    return mapUsers(await request<Row[]>('/api/v1/users'))
  },
  async createUser(input: CrmUserInput) {
    const row = await request<Row>('/api/v1/users', { method: 'POST', body: JSON.stringify({
      email: input.email, full_name: input.name, status: 'invited', role_codes: [input.role],
    }) })
    if (input.role !== 'admin') await syncUniversityAccess(number(row.id), input.universityIds, input.role === 'manager')
    return (await mapUsers([row]))[0]
  },
  async updateUser(id: number, update: CrmUserUpdate) {
    const payload: Row = {}
    if (update.name !== undefined) payload.full_name = update.name
    if (update.status !== undefined) payload.status = update.status
    if (update.role !== undefined) payload.role_codes = [update.role]
    const row = await request<Row>(`/api/v1/users/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
    if (update.universityIds !== undefined || update.role !== undefined) {
      const existing = (await mapUsers([row]))[0]
      const role = update.role ?? existing.role
      await syncUniversityAccess(id, role === 'admin' ? [] : (update.universityIds ?? existing.universityIds), role === 'manager')
    }
    return (await mapUsers([row]))[0]
  },

  async getWorkflowTemplates() { return remoteWorkflowTemplates() },
  async createWorkflowTemplate(input) {
    const row = await createRow<Row>('workflow_templates', { name: input.name, description: encodeTemplateDescription(input.description, input.statusLabels), is_default: false, is_active: true, version: 1, created_by: getSession()?.user.id ?? null })
    await Promise.all(input.stages.map((stage, index) => createRow('workflow_template_stages', {
      template_id: number(row.id), position: index + 1, code: stage.shortTitle, name: stage.title, is_optional: false,
    })))
    return (await remoteWorkflowTemplates()).find(item => item.id === number(row.id))!
  },
  async updateWorkflowTemplate(id, input) {
    await patchRow('workflow_templates', id, { name: input.name, description: encodeTemplateDescription(input.description, input.statusLabels) })
    const currentStages = (await table('workflow_template_stages')).filter(stage => number(stage.template_id) === id).sort((a, b) => number(a.position) - number(b.position))
    await Promise.all(input.stages.map((stage, index) => currentStages[index]
      ? patchRow('workflow_template_stages', number(currentStages[index].id), { position: index + 1, code: stage.shortTitle, name: stage.title })
      : createRow('workflow_template_stages', { template_id: id, position: index + 1, code: stage.shortTitle, name: stage.title, is_optional: false })))
    await Promise.all(currentStages.slice(input.stages.length).map(stage => request<void>(`/api/v1/workflow-template-stages/${number(stage.id)}`, { method: 'DELETE' })))
    return (await remoteWorkflowTemplates()).find(item => item.id === id)!
  },
  async deleteWorkflowTemplate(id) {
    const template = (await remoteWorkflowTemplates()).find(item => item.id === id)
    if (!template) throw new Error('Шаблон не найден')
    await request<void>(`/api/v1/workflow-templates/${id}`, { method: 'DELETE' })
    return template
  },
  async applyWorkflowTemplate(universityId, programId, templateId) {
    const template = (await remoteWorkflowTemplates()).find(item => item.id === templateId)
    if (!template) throw new Error('Шаблон не найден')
    let interaction = (await getInteractions(universityId)).find(item => number(item.program_id) === programId)
    if (!interaction) {
      interaction = await createRow<Row>('interactions', { university_id: universityId, program_id: programId, template_id: templateId, name: template.name, status: 'active' })
    } else {
      interaction = await patchRow<Row>('interactions', number(interaction.id), { template_id: templateId })
    }
    const currentStages = (await table('workflow_stage_instances')).filter(stage => number(stage.interaction_id) === number(interaction!.id))
    await Promise.all(currentStages.map(stage => request<void>(`/api/v1/workflow-stage-instances/${number(stage.id)}`, { method: 'DELETE' })))
    await Promise.all(template.stages.map((stage, index) => createRow('workflow_stage_instances', {
      interaction_id: number(interaction!.id), template_stage_id: stage.id, position: index + 1, code: stage.shortTitle,
      name: stage.title, status: index === 0 ? 'in_progress' : 'pending', is_optional: false,
    })))
    return remoteUniversityDetails(universityId)
  },

  async getUniversities() {
    return remoteUniversities()
  },
  async getUniversity(id) {
    return remoteUniversityDetails(id)
  },
  async getTasks() {
    try {
      const [rows, users] = await Promise.all([request<Row[]>('/api/v1/tasks?limit=200'), optionalTable('users')])
      return rows.map(row => mapTask(row, users))
    } catch (error) { throw error }
  },
  async createTask(input: TaskInput) {
    const assigneeId = await findUserId(input.owner)
    const row = await createRow<Row>('tasks', {
      university_id: input.universityId,
      program_id: input.programId ?? null,
      interaction_id: null,
      stage_instance_id: null,
      title: input.title,
      description: input.description,
      assignee_id: assigneeId,
      created_by: null,
      due_at: input.dueDate ? `${input.dueDate}T12:00:00Z` : null,
      priority: input.priority,
      status: 'open',
    })
    return mapTask(row, await optionalTable('users'))
  },
  async updateTask(id: number, update: TaskUpdate) {
    const payload: Row = {}
    if (update.title !== undefined) payload.title = update.title
    if (update.description !== undefined) payload.description = update.description
    if ('programId' in update) payload.program_id = update.programId ?? null
    if (update.dueDate !== undefined) payload.due_at = `${update.dueDate}T12:00:00Z`
    if (update.priority !== undefined) payload.priority = update.priority
    if (update.status !== undefined) payload.status = update.status
    if (update.owner !== undefined) payload.assignee_id = await findUserId(update.owner)
    const row = await request<Row>(`/api/v1/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
    return mapTask(row, await optionalTable('users'))
  },
  async getDocuments() {
    try {
      const [rows, users] = await Promise.all([request<Row[]>('/api/v1/documents?limit=200'), optionalTable('users')])
      return rows.map(row => mapDocument(row, users))
    } catch (error) { throw error }
  },
  async createDocument(input: DocumentInput) {
    const ownerId = await findUserId(input.owner)
    const row = await createRow<Row>('documents', {
      university_id: input.universityId,
      program_id: input.programId ?? null,
      interaction_id: null,
      category: input.category,
      name: input.name,
      status: documentStatusToApi(input.status),
      owner_id: ownerId,
      comment: input.note,
      current_version: 0,
    })
    if (input.file) await uploadFile(`/api/v1/documents/${number(row.id)}/versions/upload`, input.file)
    const refreshed = await request<Row>(`/api/v1/documents/${number(row.id)}`)
    return mapDocument(refreshed, await optionalTable('users'))
  },
  async updateDocument(id: number, update: DocumentUpdate) {
    const payload: Row = {}
    if ('programId' in update) payload.program_id = update.programId ?? null
    if (update.category !== undefined) payload.category = update.category
    if (update.status !== undefined) payload.status = documentStatusToApi(update.status)
    if (update.note !== undefined) payload.comment = update.note
    if (update.owner !== undefined) payload.owner_id = await findUserId(update.owner)
    if (Object.keys(payload).length) await patchRow<Row>('documents', id, payload)
    if (update.file) await uploadFile(`/api/v1/documents/${id}/versions/upload`, update.file)
    return mapDocument(await request<Row>(`/api/v1/documents/${id}`), await optionalTable('users'))
  },
  async deleteDocument(id: number) {
    const documents = await this.getDocuments()
    const document = documents.find(item => item.id === id)
    if (!document) throw new Error('Документ не найден')
    await request<void>(`/api/v1/documents/${id}`, { method: 'DELETE' })
    return document
  },
  async createUniversity(input: UniversityInput) {
    const university = await createRow<Row>('universities', {
      name: input.name,
      short_name: input.shortName,
      city: input.city,
      status: universityStatusToApi[input.status] ?? 'contact_search',
    })
    if (input.contactPerson && input.contactRole) await createRow('university_contacts', {
      university_id: number(university.id),
      full_name: input.contactPerson,
      position: input.contactRole,
      is_primary: true,
    })
    return remoteUniversityDetails(number(university.id))
  },
  async createProgram(input: ProgramInput) {
    const directions = await table('it_directions')
    if (!directions.length) throw new Error('На backend сначала нужно добавить хотя бы одно ИТ-направление')
    let products = await table('it_products')
    let product = products.find(item => text(item.name).toLowerCase() === input.product.toLowerCase())
    if (!product) product = await createRow<Row>('it_products', { name: input.product, is_active: true })
    const program = await createRow<Row>('programs', {
      university_id: input.universityId,
      direction_id: number(directions[0].id),
      name: input.name,
      applications_count: input.applications,
      students_count: input.students,
      streams_count: input.streams,
      demand_score: input.demand,
    })
    await createRow('program_products', { program_id: number(program.id), product_id: number(product.id), is_primary: true })
    return remoteUniversityDetails(input.universityId)
  },
  async updateProgramStage(universityId: number, programId: number, stageId: number, update: WorkflowStageUpdate) {
    const interactions = await getInteractions(universityId)
    const interaction = interactions.find(item => number(item.program_id) === programId)
    if (!interaction) throw new Error('Для программы ещё не создано взаимодействие (ИТ-проект)')
    const payload: Row = { status: stageStatusToApi(update.status) }
    payload.due_at = update.date ? `${update.date}T12:00:00Z` : null
    payload.responsible_user_id = update.owner ? await findUserId(update.owner) : null
    await request(`/api/v1/workflow-stage-instances/${stageId}`, {
      method: 'PATCH', body: JSON.stringify(payload),
    })
    const comments = await request<Row[]>(`/api/v1/comments/stage/${stageId}`)
    const latest = comments.filter(comment => !comment.deleted_at).sort((a, b) => text(b.created_at).localeCompare(text(a.created_at)))[0]
    const nextNote = (update.note ?? '').trim()
    if (nextNote && text(latest?.body) !== nextNote) await request(`/api/v1/comments/stage/${stageId}`, { method: 'POST', body: JSON.stringify({ body: nextNote }) })
    if (!nextNote && latest) await request<void>(`/api/v1/comments/${number(latest.id)}`, { method: 'DELETE' })
    return remoteUniversityDetails(universityId)
  },
  async uploadStageAttachment(universityId, _programId, stageId, file) {
    const uploaded = await uploadFile<Row>('/api/v1/files/upload', file)
    await createRow('stage_attachments', { stage_instance_id: stageId, file_id: text(uploaded.id), attached_by: getSession()?.user.id ?? null })
    return remoteUniversityDetails(universityId)
  },
  async deleteStageAttachment(universityId, _programId, stageId, attachmentId) {
    await request<void>(`/api/v1/stage-attachments/${stageId}/${attachmentId}`, { method: 'DELETE' })
    return remoteUniversityDetails(universityId)
  },
}
