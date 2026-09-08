export type StageStatus = 'done' | 'active' | 'pending' | 'blocked'

export interface WorkflowStage {
  id: number
  universityId: number
  programId: number
  order: number
  title: string
  shortTitle: string
  status: StageStatus
  date?: string
  owner?: string
  note?: string
}

export interface Program {
  id: number
  universityId: number
  name: string
  product: string
  students: number
  streams: number
  applications: number
  demand: number
  stage: string
  workflow: WorkflowStage[]
}

export interface Activity {
  id: number
  universityId: number
  time: string
  title: string
  description: string
  type: 'success' | 'info' | 'warning'
}

export interface University {
  id: number
  name: string
  shortName: string
  city: string
  contactPerson: string
  contactRole: string
  status: string
  programsCount: number
  activePrograms: number
  students: number
  streams: number
  progress: number
}

export type WorkflowStageUpdate = Pick<WorkflowStage, 'status' | 'owner' | 'date' | 'note'>
