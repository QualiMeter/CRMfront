import type { ApiClient, UniversityDetails } from '../api/client'
import type { CrmTask, Program, ProgramInput, TaskInput, University, UniversityInput, WorkflowStage, WorkflowStageUpdate } from '../types/domain'
import { activities, programs, universities } from '../data/mockData'
import { stageStatusLabels, workflowLabel, workflowProgress } from '../domain/workflow'

const delay = (ms = 180) => new Promise((resolve) => setTimeout(resolve, ms))
const workflowTemplate = [
  ['Поиск контактов', 'Контакт'], ['Коммуникация', 'Коммуникация'], ['Организация встречи', 'Встреча'],
  ['Обмен документами', 'Документы'], ['Корректировка документов', 'Корректировка'], ['Подписание документов', 'Подписание'],
  ['Передача материалов', 'Материалы'], ['Внедрение ИТ-продуктов', 'Внедрение'], ['Обучение преподавателей', 'Обучение'],
  ['Актуализация учебной программы', 'Программа'], ['Ведение занятий', 'Занятия'], ['Актуализация документации', 'Документация'],
  ['Повышение квалификации', 'Повышение'], ['Контроль исполнения', 'Контроль'],
] as const

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

function taskActivity(task: CrmTask, title: string) { addActivity(task.universityId, title, task.title, task.status === 'done' ? 'success' : 'info') }

export const mockApi: ApiClient = {
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
    const program = programs.find(item => item.id === programId && item.universityId === universityId)
    const stage = program?.workflow.find(item => item.id === stageId)
    if (!program || !stage) throw new Error('Этап программы не найден')
    validateUpdate(update)
    stage.status = update.status; stage.owner = update.owner?.trim() || undefined; stage.date = update.date || undefined; stage.note = update.note?.trim() || undefined
    addActivity(universityId, 'Обновлён этап программы', `${program.name} · ${stage.title}: ${stageStatusLabels[stage.status]}`, stage.status === 'done' ? 'success' : stage.status === 'blocked' ? 'warning' : 'info')
    return details(universityId)
  },
}
