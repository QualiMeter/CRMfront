import type { WorkflowStage } from '../types/domain'

export const stageStatusLabels = {
  done: 'Выполнено',
  active: 'В процессе',
  pending: 'Предстоит',
  blocked: 'Требует внимания',
} as const

export function workflowProgress(stages: WorkflowStage[]): number {
  return stages.length ? Math.round(stages.filter(stage => stage.status === 'done').length / stages.length * 100) : 0
}

export function currentStage(stages: WorkflowStage[]): WorkflowStage | undefined {
  return stages.find(stage => stage.status === 'blocked')
    ?? stages.find(stage => stage.status === 'active')
    ?? stages.find(stage => stage.status === 'pending')
    ?? stages.at(-1)
}

export function workflowLabel(stages: WorkflowStage[]): string {
  if (!stages.length) return 'Нет этапов'
  if (stages.every(stage => stage.status === 'done')) return 'Завершено'
  return currentStage(stages)!.shortTitle
}
