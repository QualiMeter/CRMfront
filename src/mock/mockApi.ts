import type { ApiClient, UniversityDetails } from '../api/client'
import type {
  CrmDocument,
  CrmTask,
  DocumentInput,
  DocumentUpdate,
  Program,
  ProgramInput,
  TaskInput,
  University,
  UniversityInput,
  WorkflowStage,
  WorkflowStageUpdate,
  WorkflowTemplate,
  WorkflowTemplateInput,
} from '../types/domain'
import { activities, programs, universities } from '../data/mockData'
import { stageStatusLabels, workflowLabel, workflowProgress } from '../domain/workflow'
import { getProfile } from '../profile'

const delay = (ms = 180) => new Promise((resolve) => setTimeout(resolve, ms))
const workflowTemplate = [
  ['Поиск контактов', 'Контакт'], ['Коммуникация', 'Коммуникация'], ['Организация встречи', 'Встреча'],
  ['Обмен документами', 'Документы'], ['Корректировка документов', 'Корректировка'], ['Подписание документов', 'Подписание'],
  ['Передача материалов', 'Материалы'], ['Внедрение ИТ-продуктов', 'Внедрение'], ['Обучение преподавателей', 'Обучение'],
  ['Актуализация учебной программы', 'Программа'], ['Ведение занятий', 'Занятия'], ['Актуализация документации', 'Документация'],
  ['Повышение квалификации', 'Повышение'], ['Контроль исполнения', 'Контроль'],
] as const

const workflowTemplates: WorkflowTemplate[] = [
  {
    id: 1,
    name: 'Базовый процесс взаимодействия',
    description: 'Системный шаблон из 14 этапов, предусмотренных техническим заданием.',
    isSystem: true,
    updatedAt: '2026-09-15T12:00:00Z',
    stages: workflowTemplate.map(([title, shortTitle], index) => ({ id: 1000 + index + 1, order: index + 1, title, shortTitle })),
    statusLabels: { done: 'Выполнено', active: 'В процессе', pending: 'Предстоит', blocked: 'Требует внимания' },
  },
  {
    id: 2,
    name: 'Пилотное внедрение',
    description: 'Сокращённый пользовательский процесс для запуска пилота.',
    isSystem: false,
    updatedAt: '2026-09-15T15:30:00Z',
    stages: [
      ['Первичный контакт', 'Контакт'], ['Диагностика потребности', 'Диагностика'], ['Согласование пилота', 'Согласование'],
      ['Развёртывание продукта', 'Внедрение'], ['Обучение команды', 'Обучение'], ['Оценка результата', 'Результат'],
    ].map(([title, shortTitle], index) => ({ id: 2000 + index + 1, order: index + 1, title, shortTitle })),
    statusLabels: { done: 'Завершено', active: 'В работе', pending: 'Запланировано', blocked: 'Есть препятствие' },
  },
]

const documents: CrmDocument[] = [
  { id: 1, universityId: 1, programId: 1, name: 'Договор о сотрудничестве.pdf', category: 'agreement', owner: 'Петров А.А.', status: 'approved', size: '1,8 МБ', mimeType: 'application/pdf', note: 'Подписанная версия договора.', version: 3, uploadedAt: '2026-09-01T09:10:00Z', updatedAt: '2026-09-08T13:15:00Z' },
  { id: 2, universityId: 1, programId: 3, name: 'Учебная программа — DevOps.docx', category: 'program', owner: 'Иванов И.С.', status: 'review', size: '740 КБ', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', note: 'Ожидаем правки кафедры по модулю контейнеризации.', version: 2, uploadedAt: '2026-09-04T10:00:00Z', updatedAt: '2026-09-09T08:30:00Z' },
  { id: 3, universityId: 2, programId: 6, name: 'Лицензия РТК Security.pdf', category: 'license', owner: 'Соколова М.А.', status: 'approved', size: '2,1 МБ', mimeType: 'application/pdf', note: '', version: 1, uploadedAt: '2026-09-05T12:00:00Z', updatedAt: '2026-09-05T12:00:00Z' },
  { id: 4, universityId: 3, programId: 7, name: 'Методические материалы.zip', category: 'methodology', owner: 'Кузнецов А.И.', status: 'draft', size: '18,4 МБ', mimeType: 'application/zip', note: 'Черновой комплект материалов для преподавателей.', version: 1, uploadedAt: '2026-09-08T11:00:00Z', updatedAt: '2026-09-08T11:00:00Z' },
  { id: 5, universityId: 4, programId: 8, name: 'Протокол встречи.pdf', category: 'protocol', owner: 'Волкова Е.О.', status: 'rejected', size: '620 КБ', mimeType: 'application/pdf', note: 'Нужно добавить список договорённостей и ответственных.', version: 1, uploadedAt: '2026-09-08T07:40:00Z', updatedAt: '2026-09-09T09:20:00Z' },
]

function universitySummary(university: University): University {
  const related = programs.filter(program => program.universityId === university.id)
  return {
    ...university,
    programsCount: related.length,
    activePrograms: related.filter(program => program.workflow.some(stage => stage.status === 'active' || stage.status === 'blocked')).length,
    students: related.reduce((sum, program) => sum + program.students, 0),
    streams: related.reduce((sum, program) => sum + program.streams, 0),
    progress: workflowProgress(related.flatMap(program => program.workflow)),
  }
}

function details(id: number): UniversityDetails {
  const university = universities.find(item => item.id === id)
  if (!university) throw new Error('Учебное заведение не найдено')
  return structuredClone({
    university: universitySummary(university),
    tasks: tasks.filter(task => task.universityId === id),
    documents: documents.filter(document => document.universityId === id),
    programs: programs.filter(program => program.universityId === id).map(program => ({ ...program, stage: workflowLabel(program.workflow) })),
    activities: activities.filter(activity => activity.universityId === id),
  })
}

function addActivity(universityId: number, title: string, description: string, type: 'success' | 'info' | 'warning' = 'info') {
  activities.unshift({
    id: Math.max(0, ...activities.map(activity => activity.id)) + 1,
    universityId,
    time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
    title,
    description,
    type,
  })
}

function validateUpdate(update: WorkflowStageUpdate) {
  if (!Object.hasOwn(stageStatusLabels, update.status)) throw new Error('Неизвестный статус этапа')
  if ((update.owner?.length ?? 0) > 120) throw new Error('Имя ответственного: не более 120 символов')
  if ((update.note?.length ?? 0) > 2000) throw new Error('Комментарий: не более 2000 символов')
  if (update.date && (!/^\d{4}-\d{2}-\d{2}$/.test(update.date) || !Number.isFinite(Date.parse(update.date)) || new Date(update.date).toISOString().slice(0, 10) !== update.date)) throw new Error('Укажите корректную дату')
}

const allowedAttachmentExtensions = new Set(['png', 'jpg', 'jpeg', 'pdf', 'zip', 'gz', 'gzip', 'rar', 'doc', 'docx', 'xls', 'xlsx'])

function findStage(universityId: number, programId: number, stageId: number) {
  const program = programs.find(item => item.id === programId && item.universityId === universityId)
  const stage = program?.workflow.find(item => item.id === stageId)
  if (!program || !stage) throw new Error('Этап программы не найден')
  return { program, stage }
}

function validateWorkflowTemplate(input: WorkflowTemplateInput) {
  if (!input.name.trim() || input.name.trim().length > 120) throw new Error('Название шаблона: от 1 до 120 символов')
  if (input.description.trim().length > 500) throw new Error('Описание: не более 500 символов')
  if (!input.stages.length) throw new Error('Добавьте хотя бы один этап')
  if (input.stages.length > 30) throw new Error('В одном процессе может быть не более 30 этапов')
  input.stages.forEach((stage, index) => {
    if (!stage.title.trim() || stage.title.trim().length > 160) throw new Error(`Этап ${index + 1}: укажите название до 160 символов`)
    if (!stage.shortTitle.trim() || stage.shortTitle.trim().length > 50) throw new Error(`Этап ${index + 1}: укажите короткое название до 50 символов`)
  })
  Object.values(input.statusLabels).forEach(label => { if (!label.trim() || label.trim().length > 40) throw new Error('Название статуса: от 1 до 40 символов') })
}

function templateFromInput(id: number, input: WorkflowTemplateInput, previous?: WorkflowTemplate): WorkflowTemplate {
  return {
    id,
    name: input.name.trim(),
    description: input.description.trim(),
    isSystem: false,
    updatedAt: new Date().toISOString(),
    stages: input.stages.map((stage, index) => ({ id: previous?.stages[index]?.id ?? id * 1000 + index + 1, order: index + 1, title: stage.title.trim(), shortTitle: stage.shortTitle.trim() })),
    statusLabels: Object.fromEntries(Object.entries(input.statusLabels).map(([key, label]) => [key, label.trim()])) as WorkflowTemplate['statusLabels'],
  }
}

const tasks: CrmTask[] = [
  { id: 1, universityId: 1, programId: 1, title: 'Согласовать дату обучения преподавателей', owner: 'Петров А.А.', dueDate: '2026-09-15', priority: 'high', description: 'Уточнить состав группы и формат обучения.', status: 'open', createdAt: '2026-09-08T09:00:00Z' },
  { id: 2, universityId: 1, programId: 2, title: 'Проверить пакет документов', owner: 'Иванов И.С.', dueDate: '2026-09-07', priority: 'normal', description: 'Проверить комплект перед подписанием.', status: 'open', createdAt: '2026-09-06T09:00:00Z' },
  { id: 3, universityId: 2, programId: 5, title: 'Подтвердить доступ к лаборатории', owner: 'Соколова М.А.', dueDate: '2026-09-12', priority: 'normal', description: '', status: 'open', createdAt: '2026-09-08T09:00:00Z' },
  { id: 4, universityId: 1, title: 'Уточнить контактное лицо', owner: 'Петров А.А.', dueDate: '2026-09-05', priority: 'low', description: '', status: 'done', createdAt: '2026-09-04T09:00:00Z' },
]

function validateTask(task: TaskInput) {
  if (!universities.some(university => university.id === task.universityId)) throw new Error('Выберите учебное заведение')
  if (task.programId !== undefined && !programs.some(program => program.id === task.programId && program.universityId === task.universityId)) throw new Error('Программа не относится к выбранному вузу')
  if (!task.title.trim() || task.title.length > 160) throw new Error('Название задачи: от 1 до 160 символов')
  if (!task.owner.trim() || task.owner.length > 120) throw new Error('Укажите ответственного (до 120 символов)')
  if (!task.dueDate || !/^\d{4}-\d{2}-\d{2}$/.test(task.dueDate) || !Number.isFinite(Date.parse(task.dueDate)) || new Date(task.dueDate).toISOString().slice(0, 10) !== task.dueDate) throw new Error('Укажите корректный срок')
  if (!['low', 'normal', 'high'].includes(task.priority)) throw new Error('Неизвестный приоритет')
  if (task.description.length > 2000) throw new Error('Описание: не более 2000 символов')
}

function validateUniversity(input: UniversityInput) {
  if (!input.name.trim() || input.name.trim().length > 300) throw new Error('Укажите название вуза')
  if (!input.shortName.trim() || input.shortName.trim().length > 30) throw new Error('Укажите аббревиатуру')
  if (!input.city.trim() || input.city.trim().length > 100) throw new Error('Укажите город')
  if (!input.contactPerson.trim() || input.contactPerson.trim().length > 160) throw new Error('Укажите контактное лицо')
  if (!input.contactRole.trim() || input.contactRole.trim().length > 160) throw new Error('Укажите должность контакта')
}

function validateProgram(input: ProgramInput) {
  if (!universities.some(university => university.id === input.universityId)) throw new Error('Выберите вуз')
  if (!input.name.trim() || input.name.trim().length > 300) throw new Error('Укажите название программы')
  if (!input.product.trim() || input.product.trim().length > 200) throw new Error('Укажите ИТ-продукт')
  for (const [label, value] of [['Обучающиеся', input.students], ['Потоки', input.streams], ['Заявки', input.applications]] as const) {
    if (!Number.isInteger(value) || value < 0) throw new Error(`${label}: укажите целое число от 0`)
  }
  if (!Number.isFinite(input.demand) || input.demand < 0 || input.demand > 100) throw new Error('Востребованность должна быть от 0 до 100')
}

function validateDocument(input: DocumentInput) {
  if (!universities.some(university => university.id === input.universityId)) throw new Error('Выберите вуз')
  if (input.programId !== undefined && !programs.some(program => program.id === input.programId && program.universityId === input.universityId)) throw new Error('Программа не относится к выбранному вузу')
  if (!input.name.trim() || input.name.trim().length > 240) throw new Error('Выберите файл с корректным названием')
  if (!input.owner.trim() || input.owner.trim().length > 120) throw new Error('Укажите ответственного')
  if (!['draft', 'review', 'approved', 'rejected'].includes(input.status)) throw new Error('Неизвестный статус документа')
  if (!['agreement', 'program', 'license', 'methodology', 'protocol', 'other'].includes(input.category)) throw new Error('Неизвестная категория документа')
  if (input.note.length > 2000) throw new Error('Комментарий: не более 2000 символов')
}

function validateDocumentUpdate(document: CrmDocument, update: DocumentUpdate) {
  const next: DocumentInput = { ...document, ...update }
  validateDocument(next)
  if (update.version !== undefined && (!Number.isInteger(update.version) || update.version < document.version)) throw new Error('Версия документа не может уменьшаться')
}

function taskActivity(task: CrmTask, title: string) { addActivity(task.universityId, title, task.title, task.status === 'done' ? 'success' : 'info') }

export const mockApi: ApiClient = {
  async getWorkflowTemplates() { await delay(); return structuredClone(workflowTemplates) },
  async createWorkflowTemplate(input) {
    await delay(); validateWorkflowTemplate(input)
    const template = templateFromInput(Math.max(0, ...workflowTemplates.map(item => item.id)) + 1, input)
    workflowTemplates.push(template)
    return structuredClone(template)
  },
  async updateWorkflowTemplate(id, input) {
    await delay(); validateWorkflowTemplate(input)
    const index = workflowTemplates.findIndex(item => item.id === id)
    if (index < 0) throw new Error('Шаблон не найден')
    if (workflowTemplates[index].isSystem) throw new Error('Системный шаблон нельзя изменять. Создайте его копию.')
    workflowTemplates[index] = templateFromInput(id, input, workflowTemplates[index])
    return structuredClone(workflowTemplates[index])
  },
  async deleteWorkflowTemplate(id) {
    await delay()
    const index = workflowTemplates.findIndex(item => item.id === id)
    if (index < 0) throw new Error('Шаблон не найден')
    if (workflowTemplates[index].isSystem) throw new Error('Системный шаблон нельзя удалить')
    const [removed] = workflowTemplates.splice(index, 1)
    return structuredClone(removed)
  },
  async applyWorkflowTemplate(universityId, programId, templateId) {
    await delay()
    const program = programs.find(item => item.id === programId && item.universityId === universityId)
    const template = workflowTemplates.find(item => item.id === templateId)
    if (!program) throw new Error('Программа не найдена')
    if (!template) throw new Error('Шаблон не найден')
    program.workflow.forEach(stage => stage.attachments?.forEach(attachment => URL.revokeObjectURL(attachment.url)))
    program.workflow = template.stages.map((stage, index) => ({ id: program.id * 10000 + Date.now() % 1000 + index, universityId, programId, order: index + 1, title: stage.title, shortTitle: stage.shortTitle, status: index === 0 ? 'active' : 'pending', ...(index === 0 ? { date: new Date().toISOString().slice(0, 10), note: `Применён шаблон «${template.name}».` } : {}) }))
    program.statusLabels = { ...template.statusLabels }
    addActivity(universityId, 'Изменён бизнес-процесс', `${program.name} · применён шаблон «${template.name}»`, 'warning')
    return details(universityId)
  },
  async getTasks() { await delay(); return structuredClone(tasks) },
  async createTask(input) {
    await delay(); validateTask(input)
    const task: CrmTask = { universityId: input.universityId, programId: input.programId, title: input.title.trim(), owner: input.owner.trim(), dueDate: input.dueDate, priority: input.priority, description: input.description.trim(), id: Math.max(0, ...tasks.map(task => task.id)) + 1, status: 'open', createdAt: new Date().toISOString() }
    tasks.unshift(task); taskActivity(task, 'Создана задача'); return structuredClone(task)
  },
  async updateTask(id, update) {
    await delay()
    const index = tasks.findIndex(task => task.id === id)
    if (index < 0) throw new Error('Задача не найдена')
    const previous = tasks[index]
    const task = { ...previous, ...update, id: previous.id, universityId: previous.universityId, createdAt: previous.createdAt }
    validateTask(task)
    if (!['open', 'done'].includes(task.status)) throw new Error('Неизвестный статус задачи')
    task.title = task.title.trim(); task.owner = task.owner.trim(); task.description = task.description.trim(); tasks[index] = task
    taskActivity(task, task.status === previous.status ? 'Обновлена задача' : task.status === 'done' ? 'Задача выполнена' : 'Задача возвращена в работу')
    return structuredClone(task)
  },

  async getDocuments() { await delay(); return structuredClone(documents) },
  async createDocument(input) {
    await delay(); validateDocument(input)
    const now = new Date().toISOString()
    const document: CrmDocument = {
      ...input,
      name: input.name.trim(),
      owner: input.owner.trim(),
      note: input.note.trim(),
      id: Math.max(0, ...documents.map(item => item.id)) + 1,
      version: 1,
      uploadedAt: now,
      updatedAt: now,
    }
    documents.unshift(document)
    addActivity(document.universityId, 'Загружен документ', `${document.name} · версия ${document.version}`, document.status === 'approved' ? 'success' : 'info')
    return structuredClone(document)
  },
  async updateDocument(id, update) {
    await delay()
    const index = documents.findIndex(document => document.id === id)
    if (index < 0) throw new Error('Документ не найден')
    const previous = documents[index]
    validateDocumentUpdate(previous, update)
    const document: CrmDocument = {
      ...previous,
      ...update,
      id: previous.id,
      universityId: previous.universityId,
      name: previous.name,
      uploadedAt: previous.uploadedAt,
      owner: (update.owner ?? previous.owner).trim(),
      note: (update.note ?? previous.note).trim(),
      updatedAt: new Date().toISOString(),
    }
    documents[index] = document
    const title = document.version > previous.version ? 'Добавлена версия документа' : document.status !== previous.status ? 'Изменён статус документа' : 'Обновлён документ'
    addActivity(document.universityId, title, `${document.name} · версия ${document.version}`, document.status === 'approved' ? 'success' : document.status === 'rejected' ? 'warning' : 'info')
    return structuredClone(document)
  },
  async deleteDocument(id) {
    await delay()
    const index = documents.findIndex(document => document.id === id)
    if (index < 0) throw new Error('Документ не найден')
    const [document] = documents.splice(index, 1)
    addActivity(document.universityId, 'Удалён документ', document.name, 'warning')
    return structuredClone(document)
  },

  async createUniversity(input) {
    await delay(); validateUniversity(input)
    const id = Math.max(0, ...universities.map(university => university.id)) + 1
    const university: University = { id, name: input.name.trim(), shortName: input.shortName.trim(), city: input.city.trim(), contactPerson: input.contactPerson.trim(), contactRole: input.contactRole.trim(), status: input.status.trim() || 'Контакт найден', programsCount: 0, activePrograms: 0, students: 0, streams: 0, progress: 0 }
    universities.unshift(university)
    addActivity(id, 'Добавлен вуз', university.name, 'success')
    return details(id)
  },
  async createProgram(input) {
    await delay(); validateProgram(input)
    const id = Math.max(0, ...programs.map(program => program.id)) + 1
    const workflow: WorkflowStage[] = workflowTemplate.map(([title, shortTitle], index) => ({ id: id * 100 + index + 1, universityId: input.universityId, programId: id, order: index + 1, title, shortTitle, status: index === 0 ? 'active' : 'pending', ...(index === 0 ? { date: new Date().toISOString().slice(0, 10), note: `Запущена программа «${input.name.trim()}».` } : {}) }))
    const program: Program = { id, universityId: input.universityId, name: input.name.trim(), product: input.product.trim(), students: input.students, streams: input.streams, applications: input.applications, demand: Math.round(input.demand), stage: 'Контакт', workflow }
    programs.unshift(program)
    addActivity(input.universityId, 'Добавлена программа', `${program.name} · ${program.product}`, 'success')
    return details(input.universityId)
  },
  async getUniversities() { await delay(); return structuredClone(universities.map(universitySummary)) },
  async getUniversity(id) { await delay(); return details(id) },
  async updateProgramStage(universityId, programId, stageId, update) {
    await delay()
    const { program, stage } = findStage(universityId, programId, stageId)
    validateUpdate(update)
    stage.status = update.status; stage.owner = update.owner?.trim() || undefined; stage.date = update.date || undefined; stage.note = update.note?.trim() || undefined
    addActivity(universityId, 'Обновлён этап программы', `${program.name} · ${stage.title}: ${stageStatusLabels[stage.status]}`, stage.status === 'done' ? 'success' : stage.status === 'blocked' ? 'warning' : 'info')
    return details(universityId)
  },
  async uploadStageAttachment(universityId, programId, stageId, file) {
    await delay()
    const { program, stage } = findStage(universityId, programId, stageId)
    const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!allowedAttachmentExtensions.has(extension)) throw new Error('Недопустимый формат. Разрешены PNG, JPEG, PDF, ZIP, GZIP, RAR, DOC, DOCX, XLS и XLSX.')
    if (!file.size) throw new Error('Нельзя загрузить пустой файл')
    if (file.size > 25 * 1024 * 1024) throw new Error('Размер файла не должен превышать 25 МБ')
    const attachment = {
      id: Math.max(0, ...programs.flatMap(item => item.workflow.flatMap(workflowStage => workflowStage.attachments?.map(item => item.id) ?? []))) + 1,
      stageId,
      name: file.name,
      size: file.size,
      mimeType: file.type || 'application/octet-stream',
      uploadedAt: new Date().toISOString(),
      uploadedBy: getProfile().name,
      url: URL.createObjectURL(file),
    }
    stage.attachments = [...(stage.attachments ?? []), attachment]
    addActivity(universityId, 'Файл прикреплён к этапу', `${program.name} · ${stage.title}: ${file.name}`, 'success')
    return details(universityId)
  },
  async deleteStageAttachment(universityId, programId, stageId, attachmentId) {
    await delay()
    const { program, stage } = findStage(universityId, programId, stageId)
    const index = stage.attachments?.findIndex(item => item.id === attachmentId) ?? -1
    if (index < 0 || !stage.attachments) throw new Error('Вложение не найдено')
    const [attachment] = stage.attachments.splice(index, 1)
    URL.revokeObjectURL(attachment.url)
    addActivity(universityId, 'Удалён файл этапа', `${program.name} · ${stage.title}: ${attachment.name}`, 'warning')
    return details(universityId)
  },
}
