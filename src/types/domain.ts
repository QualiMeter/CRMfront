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
  attachments?: StageAttachment[]
}

export interface StageAttachment {
  id: number
  stageId: number
  name: string
  size: number
  mimeType: string
  uploadedAt: string
  uploadedBy: string
  url: string
}

export interface WorkflowTemplateStage {
  id: number
  order: number
  title: string
  shortTitle: string
}

export interface WorkflowTemplate {
  id: number
  name: string
  description: string
  isSystem: boolean
  updatedAt: string
  stages: WorkflowTemplateStage[]
  statusLabels: Record<StageStatus, string>
}

export interface WorkflowTemplateInput {
  name: string
  description: string
  stages: Array<Pick<WorkflowTemplateStage, 'title' | 'shortTitle'>>
  statusLabels: Record<StageStatus, string>
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
  statusLabels?: Record<StageStatus, string>
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

export interface UniversityInput {
  name: string
  shortName: string
  city: string
  contactPerson: string
  contactRole: string
  status: string
}

export interface ProgramInput {
  universityId: number
  name: string
  product: string
  students: number
  streams: number
  applications: number
  demand: number
}

export type DocumentStatus = 'draft' | 'review' | 'approved' | 'rejected'
export type DocumentCategory = 'agreement' | 'program' | 'license' | 'methodology' | 'protocol' | 'other'

export interface DocumentInput {
  universityId: number
  programId?: number
  name: string
  category: DocumentCategory
  owner: string
  status: DocumentStatus
  size: string
  mimeType: string
  note: string
}

export interface CrmDocument extends DocumentInput {
  id: number
  version: number
  uploadedAt: string
  updatedAt: string
}

export type DocumentUpdate = Partial<Pick<CrmDocument, 'programId' | 'category' | 'owner' | 'status' | 'note' | 'version'>>

export type WorkflowStageUpdate = Pick<WorkflowStage, 'status' | 'owner' | 'date' | 'note'>

export type TaskPriority = 'low' | 'normal' | 'high'
export interface TaskInput {
  universityId: number
  programId?: number
  title: string
  owner: string
  dueDate: string
  priority: TaskPriority
  description: string
}
export interface CrmTask extends TaskInput {
  id: number
  status: 'open' | 'done'
  createdAt: string
}
export type TaskUpdate = Partial<Omit<TaskInput, 'universityId'>> & { status?: CrmTask['status'] }

export type UserRole = 'user' | 'manager' | 'admin'
export type UserStatus = 'active' | 'invited' | 'blocked'

export interface CrmUserInput {
  name: string
  email: string
  role: UserRole
  universityIds: number[]
}

export interface CrmUser extends CrmUserInput {
  id: number
  status: UserStatus
  lastActive?: string
}

export type CrmUserUpdate = Partial<Pick<CrmUser, 'name' | 'role' | 'status' | 'universityIds'>>
