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
  id: string
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

export interface WorkflowBranchRule {
  fromOrder: number
  toOrder: number
  label: string
}

export interface WorkflowTemplate {
  id: number
  name: string
  description: string
  isSystem: boolean
  updatedAt: string
  stages: WorkflowTemplateStage[]
  branches: WorkflowBranchRule[]
  statusLabels: Record<StageStatus, string>
}

export interface WorkflowTemplateInput {
  name: string
  description: string
  stages: Array<Pick<WorkflowTemplateStage, 'title' | 'shortTitle'>>
  branches: WorkflowBranchRule[]
  statusLabels: Record<StageStatus, string>
}

export interface ItDirection {
  id: number
  name: string
  code?: string
}

export interface Program {
  id: number
  universityId: number
  directionId?: number
  direction?: string
  name: string
  product: string
  students: number
  streams: number
  applications: number
  demand: number
  stage: string
  workflow: WorkflowStage[]
  branchRules?: WorkflowBranchRule[]
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
  directionId?: number
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
  file?: File
}

export interface CrmDocument extends DocumentInput {
  id: number
  version: number
  uploadedAt: string
  updatedAt: string
}

export type DocumentUpdate = Partial<Pick<CrmDocument, 'programId' | 'category' | 'owner' | 'status' | 'note'>> & { file?: File }

export type WorkflowStageUpdate = Pick<WorkflowStage, 'status' | 'owner' | 'date' | 'note'>

export type ApprovalStatus = 'pending' | 'approved' | 'rejected'
export type WorkflowTransitionKind = 'status_change' | 'rollback'

export interface WorkflowApprovalRequest {
  id: string
  kind?: WorkflowTransitionKind
  universityId: number
  universityName: string
  programId: number
  programName: string
  stageId: number
  stageTitle: string
  fromStatus: StageStatus
  toStatus: StageStatus
  update: WorkflowStageUpdate
  targetStageId?: number
  targetStageTitle?: string
  targetStageUpdate?: WorkflowStageUpdate
  requestedById: number
  requestedByName: string
  requestedAt: string
  status: ApprovalStatus
  reviewedByName?: string
  reviewedAt?: string
  reviewComment?: string
}

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

export type UserRole = 'user' | 'student' | 'teacher' | 'manager' | 'leader' | 'admin'
export type UserStatus = 'active' | 'invited' | 'blocked'

export interface InvitationLink {
  message: string
  inviteUrl: string
  expiresAt: string
}

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

export interface StudentProfile {
  userId: number
  email: string
  fullName: string
  status: string
  studentNumber?: string
  universityId?: number
  programId?: number
  courseYear?: number
  groupName?: string
  enrollmentYear?: number
  graduationYear?: number
}

export type StudentProfileInput = Omit<StudentProfile, 'userId' | 'email' | 'fullName' | 'status'>

export interface TeacherProfile {
  userId: number
  email: string
  fullName: string
  status: string
  employeeNumber?: string
  universityId?: number
  department?: string
  academicTitle?: string
  specialization?: string
}

export type TeacherProfileInput = Omit<TeacherProfile, 'userId' | 'email' | 'fullName' | 'status'>
