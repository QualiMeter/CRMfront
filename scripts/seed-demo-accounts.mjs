const apiUrl = (process.env.DEMO_API_URL || 'https://crmbackend-hw.up.railway.app').replace(/\/$/, '')

const required = name => {
  const value = process.env[name]
  if (!value) throw new Error(`Не задана переменная ${name}`)
  return value
}

const managerLogin = required('DEMO_MANAGER_LOGIN')
const managerPassword = required('DEMO_MANAGER_PASSWORD')
const studentPassword = required('DEMO_STUDENT_PASSWORD')
const teacherPassword = required('DEMO_TEACHER_PASSWORD')

const demo = {
  student: {
    email: process.env.DEMO_STUDENT_EMAIL || 'demo.student@example.com',
    username: process.env.DEMO_STUDENT_USERNAME || 'demo.student',
    fullName: process.env.DEMO_STUDENT_NAME || 'Алексей Морозов',
  },
  teacher: {
    email: process.env.DEMO_TEACHER_EMAIL || 'demo.teacher@example.com',
    username: process.env.DEMO_TEACHER_USERNAME || 'demo.teacher',
    fullName: process.env.DEMO_TEACHER_NAME || 'Елена Викторовна Соколова',
  },
}

async function request(path, { token, method = 'GET', body } = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = response.status === 204 ? null : await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(`${method} ${path}: ${data?.detail || data?.message || response.status}`)
  return data
}

async function login(username, password) {
  return request('/api/v1/auth/login', { method: 'POST', body: { username, password } })
}

async function ensureUser(managerToken, account, role) {
  const users = await request('/api/v1/users', { token: managerToken })
  let user = users.find(item => item.email.toLowerCase() === account.email.toLowerCase())
  if (!user) {
    user = await request('/api/v1/users', {
      token: managerToken,
      method: 'POST',
      body: { email: account.email, full_name: account.fullName, status: 'invited', role_codes: [role] },
    })
  } else {
    user = await request(`/api/v1/users/${user.id}`, {
      token: managerToken,
      method: 'PATCH',
      body: { full_name: account.fullName, status: user.status === 'blocked' ? 'active' : user.status, role_codes: [role] },
    })
  }
  return user
}

async function ensureUniversityAccess(managerToken, userId, universityId) {
  const rows = await request('/api/v1/user-university-access?limit=500', { token: managerToken })
  const current = rows.find(item => Number(item.user_id) === userId && Number(item.university_id) === universityId)
  if (!current) {
    await request('/api/v1/user-university-access', {
      token: managerToken,
      method: 'POST',
      body: { user_id: userId, university_id: universityId, is_manager: false },
    })
  }
}

async function ensureCredentials(managerToken, user, account, password) {
  if (user.status !== 'invited') return login(account.username, password)
  const invitation = await request(`/api/v1/users/${user.id}/invite`, { token: managerToken, method: 'POST' })
  const parsed = new URL(invitation.invite_url)
  const token = parsed.pathname.match(/\/(?:invite|accept-invite)\/([^/?#]+)/)?.[1] || parsed.searchParams.get('token')
  if (!token) throw new Error(`Backend не вернул токен приглашения для ${account.email}`)
  return request('/api/v1/auth/invitations/accept', {
    method: 'POST',
    body: { token: decodeURIComponent(token), username: account.username, password },
  })
}

async function main() {
  const manager = await login(managerLogin, managerPassword)
  const managerToken = manager.access_token
  const universities = await request('/api/v1/universities?limit=500', { token: managerToken })
  if (!universities.length) throw new Error('У менеджера нет доступных вузов')
  const universityId = Number(process.env.DEMO_UNIVERSITY_ID || universities[0].id)
  const university = universities.find(item => Number(item.id) === universityId)
  if (!university) throw new Error(`Вуз ${universityId} недоступен менеджеру`)

  const programs = await request('/api/v1/programs?limit=500', { token: managerToken })
  const universityPrograms = programs.filter(item => Number(item.university_id) === universityId)
  if (!universityPrograms.length) throw new Error('Для выбранного вуза нет программ')
  const programId = Number(process.env.DEMO_PROGRAM_ID || universityPrograms[0].id)
  if (!universityPrograms.some(item => Number(item.id) === programId)) throw new Error(`Программа ${programId} не относится к выбранному вузу`)

  const student = await ensureUser(managerToken, demo.student, 'student')
  const teacher = await ensureUser(managerToken, demo.teacher, 'teacher')
  await ensureUniversityAccess(managerToken, Number(student.id), universityId)
  await ensureUniversityAccess(managerToken, Number(teacher.id), universityId)

  const studentSession = await ensureCredentials(managerToken, student, demo.student, studentPassword)
  const teacherSession = await ensureCredentials(managerToken, teacher, demo.teacher, teacherPassword)

  await request('/api/v1/students/me', {
    token: studentSession.access_token,
    method: 'PUT',
    body: { university_id: universityId, program_id: programId, student_number: 'ST-2026-0142', course_year: 2, group_name: 'ИТ-24-1', enrollment_year: 2024, graduation_year: 2028 },
  })
  await request('/api/v1/teachers/me', {
    token: teacherSession.access_token,
    method: 'PUT',
    body: { university_id: universityId, employee_number: 'PR-0047', department: 'Кафедра информационных технологий', academic_title: 'Доцент', specialization: 'Информационные системы и разработка ПО' },
  })

  console.log(`Демо-набор готов: ${university.short_name || university.name}`)
  console.log(`Студент: ${demo.student.username} (${demo.student.email})`)
  console.log(`Преподаватель: ${demo.teacher.username} (${demo.teacher.email})`)
  console.log(`Программа ID: ${programId}`)
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
