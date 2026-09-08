import type { ApiClient, UniversityDetails } from '../api/client'
import { activities, programs, universities, workflowByUniversity } from '../data/mockData'

const delay = (ms = 180) => new Promise((resolve) => setTimeout(resolve, ms))

export const mockApi: ApiClient = {
  async getUniversities() {
    await delay()
    return universities
  },

  async getUniversity(id: number): Promise<UniversityDetails> {
    await delay()
    const university = universities.find((item) => item.id === id)
    if (!university) throw new Error('Учебное заведение не найдено')

    return {
      university,
      workflow: workflowByUniversity[id] ?? [],
      programs: programs.filter((program) => program.universityId === id),
      activities: activities.filter((activity) => activity.universityId === id),
    }
  },
}
