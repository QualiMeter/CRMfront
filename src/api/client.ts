import type {
  Activity,
  CrmDocument,
  CrmTask,
  DocumentInput,
  DocumentUpdate,
  Program,
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
} from '../types/domain'

export interface UniversityDetails {
  tasks: CrmTask[]
  documents: CrmDocument[]
  university: University
  programs: Program[]
  activities: Activity[]
}

export interface ApiClient {
  getUsers(): Promise<CrmUser[]>
  createUser(input: CrmUserInput): Promise<CrmUser>
  updateUser(id: number, update: CrmUserUpdate): Promise<CrmUser>
  getTasks(): Promise<CrmTask[]>
  createTask(input: TaskInput): Promise<CrmTask>
  updateTask(id: number, update: TaskUpdate): Promise<CrmTask>

  getDocuments(): Promise<CrmDocument[]>
  createDocument(input: DocumentInput): Promise<CrmDocument>
  updateDocument(id: number, update: DocumentUpdate): Promise<CrmDocument>
  deleteDocument(id: number): Promise<CrmDocument>

  createUniversity(input: UniversityInput): Promise<UniversityDetails>
  createProgram(input: ProgramInput): Promise<UniversityDetails>
  updateProgramStage(universityId: number, programId: number, stageId: number, update: WorkflowStageUpdate): Promise<UniversityDetails>
  uploadStageAttachment(universityId: number, programId: number, stageId: number, file: File): Promise<UniversityDetails>
  deleteStageAttachment(universityId: number, programId: number, stageId: number, attachmentId: string): Promise<UniversityDetails>
  getWorkflowTemplates(): Promise<WorkflowTemplate[]>
  createWorkflowTemplate(input: WorkflowTemplateInput): Promise<WorkflowTemplate>
  updateWorkflowTemplate(id: number, input: WorkflowTemplateInput): Promise<WorkflowTemplate>
  deleteWorkflowTemplate(id: number): Promise<WorkflowTemplate>
  applyWorkflowTemplate(universityId: number, programId: number, templateId: number): Promise<UniversityDetails>
  getUniversities(): Promise<University[]>
  getUniversity(id: number): Promise<UniversityDetails>
}
