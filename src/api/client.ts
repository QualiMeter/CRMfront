import type { Activity, Program, University, WorkflowStage } from '../types/domain'

export interface UniversityDetails {
  university: University
  workflow: WorkflowStage[]
  programs: Program[]
  activities: Activity[]
}

export interface ApiClient {
  getUniversities(): Promise<University[]>
  getUniversity(id: number): Promise<UniversityDetails>
}
