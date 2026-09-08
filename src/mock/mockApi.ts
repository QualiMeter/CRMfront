import type { ApiClient, UniversityDetails } from '../api/client'
import type { University, WorkflowStageUpdate } from '../types/domain'
import { activities, programs, universities } from '../data/mockData'
import { stageStatusLabels, workflowLabel, workflowProgress } from '../domain/workflow'

const delay = (ms = 180) => new Promise((resolve) => setTimeout(resolve, ms))

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
    programs: programs.filter(program => program.universityId === id).map(program => ({ ...program, stage: workflowLabel(program.workflow) })),
    activities: activities.filter(activity => activity.universityId === id),
  })
}

function validateUpdate(update: WorkflowStageUpdate) {
  if (!Object.hasOwn(stageStatusLabels, update.status)) throw new Error('Неизвестный статус этапа')
  if ((update.owner?.length ?? 0) > 120) throw new Error('Имя ответственного: не более 120 символов')
  if ((update.note?.length ?? 0) > 2000) throw new Error('Комментарий: не более 2000 символов')
  if (update.date && (!/^\d{4}-\d{2}-\d{2}$/.test(update.date) || !Number.isFinite(Date.parse(update.date)) || new Date(update.date).toISOString().slice(0, 10) !== update.date)) {
    throw new Error('Укажите корректную дату')
  }
}

// Demo state lives for the lifetime of the page; replace this adapter with HTTP later.
export const mockApi: ApiClient = {
  async getUniversities() {
    await delay()
    return structuredClone(universities.map(universitySummary))
  },
  async getUniversity(id) {
    await delay()
    return details(id)
  },
  async updateProgramStage(universityId, programId, stageId, update) {
    await delay()
    const program = programs.find(item => item.id === programId && item.universityId === universityId)
    const stage = program?.workflow.find(item => item.id === stageId)
    if (!program || !stage) throw new Error('Этап программы не найден')
    validateUpdate(update)
    stage.status = update.status
    stage.owner = update.owner?.trim() || undefined
    stage.date = update.date || undefined
    stage.note = update.note?.trim() || undefined
    activities.unshift({
      id: Math.max(0, ...activities.map(activity => activity.id)) + 1,
      universityId,
      time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      title: 'Обновлён этап программы',
      description: `${program.name} · ${stage.title}: ${stageStatusLabels[stage.status]}`,
      type: stage.status === 'done' ? 'success' : stage.status === 'blocked' ? 'warning' : 'info',
    })
    return details(universityId)
  },
}
