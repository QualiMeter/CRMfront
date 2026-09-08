import type { Activity, Program, University, WorkflowStageUpdate } from '../types/domain'

export interface UniversityDetails {
  university: University
  programs: Program[]
  activities: Activity[]
}

export interface ApiClient {
  updateProgramStage(universityId: number, programId: number, stageId: number, update: WorkflowStageUpdate): Promise<UniversityDetails>
  getUniversities(): Promise<University[]>
  getUniversity(id: number): Promise<UniversityDetails>
}
