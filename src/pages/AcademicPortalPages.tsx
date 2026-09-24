import { useMemo, useState } from 'react'
import { Icon } from '../components/Icon'
import type {
  CrmDocument,
  Program,
  StudentProfile,
  StudentProfileInput,
  TeacherProfile,
  TeacherProfileInput,
  University,
} from '../types/domain'
import type { AuthUser } from '../api/auth'

type Navigate = (path: string) => void

const valueOrDash = (value?: string | number) => value ?? 'Не указано'

export function PendingRolePage({ user }: { user: AuthUser }) {
  return <div className="content portal-page pending-role-page">
    <section className="portal-hero pending-role-hero">
      <div><div className="eyebrow">ПРОФИЛЬ СОЗДАН</div><h1>Добро пожаловать, {user.full_name || user.username}</h1><p>Аккаунт активен, но учебная роль ещё не назначена.</p></div>
      <span className="portal-role-chip waiting">Ожидает назначения</span>
    </section>
    <section className="card pending-role-card">
      <div className="pending-role-icon"><Icon name="clock" size={28} /></div>
      <div><h2>Что произойдёт дальше</h2><p>Менеджер вашего учебного заведения назначит роль студента или преподавателя и укажет доступный вуз. После этого здесь автоматически появится персональный кабинет.</p></div>
      <ol><li><span>1</span>Регистрация завершена</li><li><span>2</span>Менеджер назначает роль</li><li><span>3</span>Открывается учебный кабинет</li></ol>
      <div className="pending-contact"><span>Учётная запись</span><strong>{user.email}</strong></div>
    </section>
  </div>
}

export function StudentOverviewPage({ profile, university, program, documents, navigate }: { profile: StudentProfile; university?: University; program?: Program; documents: CrmDocument[]; navigate: Navigate }) {
  const profileFields = [profile.studentNumber, profile.universityId, profile.programId, profile.courseYear, profile.groupName, profile.enrollmentYear]
  const completion = Math.round(profileFields.filter(Boolean).length / profileFields.length * 100)
  const relatedDocuments = documents.filter(item => !profile.programId || !item.programId || item.programId === profile.programId)
  return <div className="content portal-page">
    <section className="portal-hero student-hero">
      <div><div className="eyebrow">КАБИНЕТ СТУДЕНТА</div><h1>Привет, {profile.fullName.split(' ')[0] || 'студент'}!</h1><p>{program ? `Ваша программа — ${program.name}` : 'Заполните учебный профиль, чтобы увидеть свою программу.'}</p></div>
      <button className="portal-hero-action" onClick={() => navigate('/profile')}>Профиль заполнен на {completion}% <Icon name="arrow" size={16} /></button>
    </section>
    <section className="portal-kpis">
      <PortalKpi label="Курс" value={profile.courseYear ? `${profile.courseYear}` : '—'} caption="текущий год" icon="book" />
      <PortalKpi label="Группа" value={profile.groupName || '—'} caption="учебная группа" icon="users" />
      <PortalKpi label="Материалы" value={relatedDocuments.length} caption="доступных документов" icon="file" />
      <PortalKpi label="Этапов программы" value={program?.workflow.length ?? 0} caption="в учебном треке" icon="check" />
    </section>
    <div className="portal-grid">
      <section className="card portal-primary-card">
        <div className="card-header"><div><div className="eyebrow">МОЯ ПРОГРАММА</div><h2>{program?.name || 'Программа пока не выбрана'}</h2></div>{program && <button className="outline-button" onClick={() => navigate('/my-program')}>Подробнее</button>}</div>
        {program ? <><p className="portal-program-product">{program.product}</p><div className="portal-progress"><span><b>Прогресс взаимодействия</b><em>{program.workflow.filter(stage => stage.status === 'done').length} из {program.workflow.length} этапов</em></span><i><b style={{ width: `${program.workflow.length ? program.workflow.filter(stage => stage.status === 'done').length / program.workflow.length * 100 : 0}%` }} /></i></div><div className="portal-stage-list">{program.workflow.slice(0, 4).map(stage => <div key={stage.id} className={stage.status}><span>{stage.status === 'done' ? '✓' : stage.order}</span><div><strong>{stage.title}</strong><small>{stage.date || stage.shortTitle}</small></div></div>)}</div></> : <EmptyPortalState text="Выберите вуз и программу в профиле — кабинет сразу обновится." action="Заполнить профиль" onClick={() => navigate('/profile')} />}
      </section>
      <section className="card portal-side-card"><div className="eyebrow">МОЙ ВУЗ</div><h2>{university?.shortName || 'Не выбран'}</h2><p>{university?.name || 'Укажите учебное заведение в профиле.'}</p><dl><div><dt>Город</dt><dd>{valueOrDash(university?.city)}</dd></div><div><dt>Статус</dt><dd>{valueOrDash(university?.status)}</dd></div><div><dt>Программ</dt><dd>{university?.programsCount ?? '—'}</dd></div></dl></section>
    </div>
    <section className="card portal-documents-preview"><div className="card-header"><div><h2>Последние материалы</h2><p>Документы вашей программы и учебного заведения</p></div><button className="outline-button" onClick={() => navigate('/documents')}>Все материалы</button></div><div className="portal-document-list">{relatedDocuments.slice(0, 4).map(document => <article key={document.id}><Icon name="file" size={20} /><div><strong>{document.name}</strong><small>{document.category} · версия {document.version}</small></div><span>{document.status === 'approved' ? 'Доступен' : 'На проверке'}</span></article>)}{!relatedDocuments.length && <p className="empty-state">Материалы пока не опубликованы.</p>}</div></section>
  </div>
}

export function TeacherOverviewPage({ profile, university, programs, students, navigate }: { profile: TeacherProfile; university?: University; programs: Program[]; students: StudentProfile[]; navigate: Navigate }) {
  const ownStudents = profile.universityId ? students.filter(student => student.universityId === profile.universityId) : students
  return <div className="content portal-page">
    <section className="portal-hero teacher-hero"><div><div className="eyebrow">КАБИНЕТ ПРЕПОДАВАТЕЛЯ</div><h1>{profile.fullName}</h1><p>{profile.department || 'Укажите кафедру в профиле'}{university ? ` · ${university.shortName}` : ''}</p></div><button className="portal-hero-action" onClick={() => navigate('/profile')}>Редактировать профиль <Icon name="arrow" size={16} /></button></section>
    <section className="portal-kpis"><PortalKpi label="Студенты" value={ownStudents.length} caption="в доступном вузе" icon="users" /><PortalKpi label="Программы" value={programs.length} caption="образовательных треков" icon="book" /><PortalKpi label="Кафедра" value={profile.department || '—'} caption="подразделение" icon="building" /><PortalKpi label="Специализация" value={profile.specialization || '—'} caption="профиль работы" icon="chart" /></section>
    <div className="portal-grid teacher-grid">
      <section className="card portal-primary-card"><div className="card-header"><div><div className="eyebrow">ПРОГРАММЫ ВУЗА</div><h2>Образовательные программы</h2></div><button className="outline-button" onClick={() => navigate('/programs')}>Показать все</button></div><div className="teacher-program-list">{programs.slice(0, 4).map(program => <article key={program.id}><div><strong>{program.name}</strong><small>{program.product}</small></div><span>{program.students} студентов</span></article>)}{!programs.length && <EmptyPortalState text="После выбора вуза здесь появятся его программы." action="Заполнить профиль" onClick={() => navigate('/profile')} />}</div></section>
      <section className="card portal-side-card"><div className="card-header"><div><div className="eyebrow">СТУДЕНТЫ</div><h2>Последние профили</h2></div></div><div className="teacher-student-mini-list">{ownStudents.slice(0, 5).map(student => <article key={student.userId}><span>{student.fullName.split(/\s+/).map(part => part[0]).slice(0, 2).join('')}</span><div><strong>{student.fullName}</strong><small>{student.groupName || 'Группа не указана'}{student.courseYear ? ` · ${student.courseYear} курс` : ''}</small></div></article>)}{!ownStudents.length && <p className="empty-state">Студенты пока не добавлены.</p>}</div>{ownStudents.length > 0 && <button className="outline-button portal-full-button" onClick={() => navigate('/students')}>Открыть список</button>}</section>
    </div>
  </div>
}

export function AcademicProfilePage({ role, profile, universities, programs, onSave }: { role: 'student'; profile: StudentProfile; universities: University[]; programs: Program[]; onSave: (input: StudentProfileInput) => Promise<void> } | { role: 'teacher'; profile: TeacherProfile; universities: University[]; programs: Program[]; onSave: (input: TeacherProfileInput) => Promise<void> }) {
  const isStudent = role === 'student'
  const [form, setForm] = useState<Record<string, string>>(() => ({
    studentNumber: isStudent ? profile.studentNumber || '' : '',
    employeeNumber: !isStudent ? profile.employeeNumber || '' : '',
    universityId: String(profile.universityId || ''),
    programId: isStudent ? String(profile.programId || '') : '',
    courseYear: isStudent ? String(profile.courseYear || '') : '',
    groupName: isStudent ? profile.groupName || '' : '',
    enrollmentYear: isStudent ? String(profile.enrollmentYear || '') : '',
    graduationYear: isStudent ? String(profile.graduationYear || '') : '',
    department: !isStudent ? profile.department || '' : '',
    academicTitle: !isStudent ? profile.academicTitle || '' : '',
    specialization: !isStudent ? profile.specialization || '' : '',
  }))
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const availablePrograms = programs.filter(program => !form.universityId || program.universityId === Number(form.universityId))
  const set = (field: string, value: string) => setForm(current => ({ ...current, [field]: value }))
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError(''); setMessage('')
    try {
      if (isStudent) await onSave({ studentNumber: form.studentNumber || undefined, universityId: Number(form.universityId) || undefined, programId: Number(form.programId) || undefined, courseYear: Number(form.courseYear) || undefined, groupName: form.groupName || undefined, enrollmentYear: Number(form.enrollmentYear) || undefined, graduationYear: Number(form.graduationYear) || undefined })
      else await onSave({ employeeNumber: form.employeeNumber || undefined, universityId: Number(form.universityId) || undefined, department: form.department || undefined, academicTitle: form.academicTitle || undefined, specialization: form.specialization || undefined })
      setMessage('Профиль сохранён')
    } catch (err) { setError(err instanceof Error ? err.message : 'Не удалось сохранить профиль') }
    finally { setSaving(false) }
  }
  return <div className="content portal-page academic-profile-page"><div className="page-heading"><div><div className="eyebrow">{isStudent ? 'ПРОФИЛЬ СТУДЕНТА' : 'ПРОФИЛЬ ПРЕПОДАВАТЕЛЯ'}</div><h1>Мои данные</h1><p className="muted">Эти сведения формируют ваш персональный кабинет</p></div></div>{message && <p className="profile-message" role="status">{message}</p>}<div className="academic-profile-layout"><section className="card academic-identity"><div className="profile-avatar-large">{profile.fullName.split(/\s+/).map(part => part[0]).slice(0, 2).join('')}</div><h2>{profile.fullName}</h2><p>{isStudent ? 'Студент' : 'Преподаватель'}</p><a href={`mailto:${profile.email}`}>{profile.email}</a><span className="portal-role-chip active">Активный профиль</span></section><form className="card academic-profile-form" onSubmit={submit}><div className="card-header"><div><h2>Учебная информация</h2><p>Заполните поля, необходимые для работы кабинета</p></div></div><fieldset disabled={saving}><div className="academic-form-grid">{isStudent ? <><label>Номер студента<input value={form.studentNumber} onChange={e => set('studentNumber', e.target.value)} /></label><label>Курс<input type="number" min="1" max="12" value={form.courseYear} onChange={e => set('courseYear', e.target.value)} /></label><label className="wide">Учебное заведение<select value={form.universityId} onChange={e => { set('universityId', e.target.value); set('programId', '') }}><option value="">Не выбрано</option>{universities.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="wide">Программа<select value={form.programId} onChange={e => set('programId', e.target.value)}><option value="">Не выбрана</option>{availablePrograms.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Группа<input value={form.groupName} onChange={e => set('groupName', e.target.value)} /></label><label>Год поступления<input type="number" min="1900" max="2200" value={form.enrollmentYear} onChange={e => set('enrollmentYear', e.target.value)} /></label><label>Год выпуска<input type="number" min="1900" max="2200" value={form.graduationYear} onChange={e => set('graduationYear', e.target.value)} /></label></> : <><label>Табельный номер<input value={form.employeeNumber} onChange={e => set('employeeNumber', e.target.value)} /></label><label>Учёное звание<input value={form.academicTitle} onChange={e => set('academicTitle', e.target.value)} /></label><label className="wide">Учебное заведение<select value={form.universityId} onChange={e => set('universityId', e.target.value)}><option value="">Не выбрано</option>{universities.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="wide">Кафедра<input value={form.department} onChange={e => set('department', e.target.value)} /></label><label className="wide">Специализация<textarea rows={3} value={form.specialization} onChange={e => set('specialization', e.target.value)} /></label></>}</div>{error && <p className="form-error" role="alert">{error}</p>}<div className="academic-form-actions"><button className="primary-button">{saving ? 'Сохранение…' : 'Сохранить профиль'}</button></div></fieldset></form></div></div>
}

export function TeacherStudentsPage({ students, universities, programs }: { students: StudentProfile[]; universities: University[]; programs: Program[] }) {
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => students.filter(student => `${student.fullName} ${student.email} ${student.groupName || ''}`.toLowerCase().includes(query.toLowerCase())), [students, query])
  return <div className="content portal-page"><div className="page-heading"><div><div className="eyebrow">УЧЕБНАЯ ГРУППА</div><h1>Студенты</h1><p className="muted">Профили студентов доступного учебного заведения</p></div></div><section className="card academic-list-card"><label className="list-search"><Icon name="search" size={17} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Поиск по имени, email или группе" /></label><div className="academic-student-table"><div className="academic-student-head"><span>Студент</span><span>Вуз и программа</span><span>Курс</span><span>Группа</span></div>{filtered.map(student => <article key={student.userId}><div className="users-person"><span>{student.fullName.split(/\s+/).map(part => part[0]).slice(0, 2).join('')}</span><div><strong>{student.fullName}</strong><small>{student.email}</small></div></div><div><strong>{universities.find(item => item.id === student.universityId)?.shortName || 'Вуз не указан'}</strong><small>{programs.find(item => item.id === student.programId)?.name || 'Программа не указана'}</small></div><span>{student.courseYear ? `${student.courseYear} курс` : '—'}</span><span>{student.groupName || '—'}</span></article>)}{!filtered.length && <p className="empty-state">Студенты не найдены.</p>}</div></section></div>
}

export function AcademicProgramsPage({ title, programs, studentProgramId }: { title: string; programs: Program[]; studentProgramId?: number }) {
  const visible = studentProgramId ? programs.filter(program => program.id === studentProgramId) : programs
  return <div className="content portal-page"><div className="page-heading"><div><div className="eyebrow">ОБРАЗОВАТЕЛЬНЫЕ ТРЕКИ</div><h1>{title}</h1><p className="muted">Содержание и этапы программ без административных инструментов CRM</p></div></div><div className="academic-program-grid">{visible.map(program => <article className="card academic-program-card" key={program.id}><div className="academic-program-top"><span><Icon name="book" size={21} /></span><div><h2>{program.name}</h2><p>{program.product}</p></div></div><div className="academic-program-meta"><span><b>{program.students}</b> студентов</span><span><b>{program.streams}</b> потоков</span><span><b>{program.workflow.length}</b> этапов</span></div><div className="portal-stage-list">{program.workflow.map(stage => <div key={stage.id} className={stage.status}><span>{stage.status === 'done' ? '✓' : stage.order}</span><div><strong>{stage.title}</strong><small>{stage.date || stage.shortTitle}</small></div></div>)}</div></article>)}{!visible.length && <section className="card"><p className="empty-state">Доступные программы пока не определены.</p></section>}</div></div>
}

export function AcademicDocumentsPage({ documents, programId }: { documents: CrmDocument[]; programId?: number }) {
  const visible = documents.filter(item => !programId || !item.programId || item.programId === programId)
  return <div className="content portal-page"><div className="page-heading"><div><div className="eyebrow">УЧЕБНЫЕ МАТЕРИАЛЫ</div><h1>Документы</h1><p className="muted">Доступные материалы без возможности изменения</p></div></div><section className="academic-document-grid">{visible.map(document => <article className="card academic-document-card" key={document.id}><span><Icon name="file" size={24} /></span><div><h2>{document.name}</h2><p>{document.note || 'Описание не добавлено'}</p><small>{document.category} · версия {document.version} · {document.size}</small></div><b className={`document-state ${document.status}`}>{document.status === 'approved' ? 'Опубликован' : document.status === 'review' ? 'На проверке' : 'Черновик'}</b></article>)}{!visible.length && <section className="card"><p className="empty-state">Доступные документы пока не опубликованы.</p></section>}</section></div>
}

function PortalKpi({ label, value, caption, icon }: { label: string; value: string | number; caption: string; icon: 'book' | 'users' | 'file' | 'check' | 'building' | 'chart' }) {
  return <article className="card portal-kpi"><span><Icon name={icon} size={20} /></span><div><small>{label}</small><strong>{value}</strong><p>{caption}</p></div></article>
}

function EmptyPortalState({ text, action, onClick }: { text: string; action: string; onClick: () => void }) {
  return <div className="portal-empty"><p>{text}</p><button className="outline-button" onClick={onClick}>{action}</button></div>
}
