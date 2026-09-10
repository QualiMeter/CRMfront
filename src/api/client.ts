import type { CrmTask, TaskInput, TaskUpdate, Activity, Program, ProgramInput, University, UniversityInput, WorkflowStageUpdate } from '../types/domain'

export interface UniversityDetails {
  tasks: CrmTask[]
  university: University
  programs: Program[]
  activities: Activity[]
}

export interface ApiClient {
  getTasks(): Promise<CrmTask[]>
  createTask(input: TaskInput): Promise<CrmTask>
  updateTask(id: number, update: TaskUpdate): Promise<CrmTask>
  createUniversity(input: UniversityInput): Promise<UniversityDetails>
  createProgram(input: ProgramInput): Promise<UniversityDetails>
  updateProgramStage(universityId: number, programId: number, stageId: number, update: WorkflowStageUpdate): Promise<UniversityDetails>
  getUniversities(): Promise<University[]>
  getUniversity(id: number): Promise<UniversityDetails>
}
