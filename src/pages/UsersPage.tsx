import { useMemo, useState } from 'react'
import { Icon } from '../components/Icon'
import type { CrmUser, CrmUserInput, CrmUserUpdate, InvitationLink, University, UserRole } from '../types/domain'
import '../users.css'

const roleLabels: Record<UserRole, string> = { user: 'Без роли', student: 'Студент', teacher: 'Преподаватель', manager: 'Менеджер', admin: 'Администратор' }
const statusLabels: Record<CrmUser['status'], string> = { active: 'Активен', invited: 'Приглашён', blocked: 'Заблокирован' }
const emptyForm = (managerMode: boolean): CrmUserInput => ({ name: '', email: '', role: managerMode ? 'student' : 'student', universityIds: [] })

export function UsersPage({ users, universities, managerMode, onCreate, onUpdate, onInvite, onRevokeInvite }: {
  users: CrmUser[]
  universities: University[]
  managerMode: boolean
  onCreate: (input: CrmUserInput) => Promise<InvitationLink>
  onUpdate: (id: number, update: CrmUserUpdate) => Promise<void>
  onInvite: (id: number) => Promise<InvitationLink>
  onRevokeInvite: (id: number) => Promise<void>
}) {
  const [query, setQuery] = useState('')
  const [role, setRole] = useState<UserRole | 'all'>('all')
  const [status, setStatus] = useState<CrmUser['status'] | 'all'>('all')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<CrmUser | null>(null)
  const [form, setForm] = useState<CrmUserInput>(() => emptyForm(managerMode))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [invitation, setInvitation] = useState<InvitationLink | null>(null)
  const allowedRoles: UserRole[] = managerMode ? ['student', 'teacher'] : ['user', 'student', 'teacher', 'manager', 'admin']
  const selectedUniversity = universities.find(university => university.id === form.universityIds[0])

  const filtered = useMemo(() => users.filter(user => {
    const search = query.trim().toLowerCase()
    return (!search || `${user.name} ${user.email}`.toLowerCase().includes(search)) && (role === 'all' || user.role === role) && (status === 'all' || user.status === status)
  }), [users, query, role, status])
  const stats = useMemo(() => ({ active: users.filter(user => user.status === 'active').length, students: users.filter(user => user.role === 'student').length, teachers: users.filter(user => user.role === 'teacher').length, invited: users.filter(user => user.status === 'invited').length }), [users])

  function openCreate() { setCreating(true); setEditing(null); setForm(emptyForm(managerMode)); setError(''); setMessage(''); setInvitation(null) }
  function openEdit(user: CrmUser) {
    const editRole = managerMode && user.role === 'user' ? 'student' : user.role
    setEditing(user); setCreating(false); setForm({ name: user.name, email: user.email, role: editRole, universityIds: [...user.universityIds] }); setError(''); setMessage(''); setInvitation(null)
  }
  function closeModal() { if (!saving) { setCreating(false); setEditing(null); setError('') } }
  function selectUniversity(id: number) {
    if (form.role === 'student' || form.role === 'teacher') setForm(current => ({ ...current, universityIds: [id] }))
    else setForm(current => ({ ...current, universityIds: current.universityIds.includes(id) ? current.universityIds.filter(item => item !== id) : [...current.universityIds, id] }))
  }
  async function copyLink(link: string) {
    try { await navigator.clipboard.writeText(link); setMessage('Персональная ссылка скопирована.') }
    catch { window.prompt('Скопируйте персональную ссылку:', link) }
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError(''); setMessage('')
    try {
      if ((form.role === 'student' || form.role === 'teacher' || form.role === 'manager') && !form.universityIds.length) throw new Error('Выберите хотя бы один доступный вуз')
      if (editing) {
        await onUpdate(editing.id, { name: form.name, role: form.role, universityIds: form.universityIds })
        const scope = selectedUniversity ? ` · ${selectedUniversity.shortName}` : ''
        setMessage(`${form.name}: назначена роль «${roleLabels[form.role]}»${scope}. Новый кабинет откроется при следующем входе.`); setEditing(null)
      } else {
        const link = await onCreate(form)
        setInvitation(link); setCreating(false); setMessage(`${form.name}: приглашение создано, роль и вуз уже назначены.`)
      }
    } catch (err) { setError(err instanceof Error ? err.message : 'Не удалось сохранить пользователя') }
    finally { setSaving(false) }
  }
  async function createFreshInvite(user: CrmUser) {
    setSaving(true); setError(''); setMessage('')
    try { const link = await onInvite(user.id); setInvitation(link); setMessage(`Новая ссылка для ${user.name} готова.`) }
    catch (err) { setError(err instanceof Error ? err.message : 'Не удалось создать приглашение') }
    finally { setSaving(false) }
  }
  async function revokeInvite(user: CrmUser) {
    if (!window.confirm(`Отозвать приглашение для «${user.name}»? Старая ссылка перестанет работать.`)) return
    setSaving(true); setError(''); setMessage('')
    try { await onRevokeInvite(user.id); setInvitation(null); setMessage('Приглашение отозвано.') }
    catch (err) { setError(err instanceof Error ? err.message : 'Не удалось отозвать приглашение') }
    finally { setSaving(false) }
  }
  async function toggleBlocked(user: CrmUser) {
    const next = user.status === 'blocked' ? 'active' : 'blocked'
    if (next === 'blocked' && !window.confirm(`Заблокировать пользователя «${user.name}»?`)) return
    setSaving(true); setError(''); setMessage('')
    try { await onUpdate(user.id, { status: next }); setMessage(next === 'blocked' ? 'Доступ пользователя заблокирован.' : 'Доступ пользователя восстановлен.') }
    catch (err) { setError(err instanceof Error ? err.message : 'Не удалось изменить статус') }
    finally { setSaving(false) }
  }

  return <div className="content users-workspace">
    <div className="page-heading"><div><div className="eyebrow">ДОСТУП И УЧЕБНЫЕ РОЛИ</div><h1>Пользователи</h1><p className="muted">{managerMode ? 'Студенты и преподаватели доступных вам учебных заведений' : 'Все пользователи, роли и области доступа системы'}</p></div><div className="users-heading-actions"><button className="primary-button" onClick={openCreate}><Icon name="plus" size={17} /> Пригласить пользователя</button></div></div>
    {managerMode && <section className="card assignment-flow" aria-label="Сценарий подключения пользователя"><div className="assignment-flow-title"><div className="eyebrow">ПОДКЛЮЧЕНИЕ К КАБИНЕТУ</div><strong>От регистрации до персональной страницы</strong></div><ol><li className="done"><span>1</span><div><strong>Аккаунт</strong><small>Приглашение или самостоятельная регистрация</small></div></li><li className="active"><span>2</span><div><strong>Роль и вуз</strong><small>Назначает менеджер доступного вуза</small></div></li><li><span>3</span><div><strong>Учебный профиль</strong><small>Пользователь дополняет программу и данные</small></div></li></ol></section>}
    <section className="users-kpis"><UserKpi label="Всего" value={users.length} /><UserKpi label="Студенты" value={stats.students} tone="green" /><UserKpi label="Преподаватели" value={stats.teachers} /><UserKpi label="Активные" value={stats.active} /><UserKpi label="Ожидают входа" value={stats.invited} tone="orange" /></section>
    <section className="card users-role-guide"><div><strong>Без роли</strong><span>Самостоятельно зарегистрировался и ожидает назначения</span></div><div><strong>Студент</strong><span>Своя программа, материалы и учебный профиль</span></div><div><strong>Преподаватель</strong><span>Программы и студенты своего вуза</span></div>{!managerMode && <><div><strong>Менеджер</strong><span>Рабочая CRM и пользователи своих вузов</span></div><div><strong>Администратор</strong><span>Полный доступ ко всей системе</span></div></>}</section>
    {invitation && <section className="card invitation-result"><div><div className="eyebrow">ПЕРСОНАЛЬНОЕ ПРИГЛАШЕНИЕ</div><strong>Ссылка действует до {new Date(invitation.expiresAt).toLocaleString('ru-RU')}</strong><p>{invitation.inviteUrl}</p></div><button className="primary-button" onClick={() => void copyLink(invitation.inviteUrl)}>Скопировать ссылку</button></section>}
    {message && <p className="users-feedback success" role="status">{message}</p>}{error && !creating && !editing && <p className="users-feedback error" role="alert">{error}</p>}
    <section className="card users-card"><div className="users-toolbar"><label className="list-search"><Icon name="search" size={17} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Поиск по имени или email" /></label><select value={role} onChange={event => setRole(event.target.value as UserRole | 'all')}><option value="all">Все роли</option>{Object.entries(roleLabels).filter(([value]) => !managerMode || ['user', 'student', 'teacher'].includes(value)).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><select value={status} onChange={event => setStatus(event.target.value as CrmUser['status'] | 'all')}><option value="all">Все статусы</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><div className="users-table"><div className="users-head"><span>Пользователь</span><span>Роль</span><span>Учебное заведение</span><span>Последняя активность</span><span>Статус</span><span /></div>{filtered.map(user => <article key={user.id} className={`${user.status === 'blocked' ? 'blocked ' : ''}${user.role === 'user' ? 'awaiting-role' : ''}`}><div className="users-person"><span>{user.name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()}</span><div><strong>{user.name}</strong><small>{user.email}</small></div></div><span className={`user-role ${user.role}`}>{roleLabels[user.role]}</span><div className="user-access">{user.role === 'admin' ? <strong>Все вузы</strong> : <>{user.universityIds.slice(0, 2).map(id => <span key={id}>{universities.find(item => item.id === id)?.shortName ?? `#${id}`}</span>)}{!user.universityIds.length && <small>{user.role === 'user' ? 'Нужно назначить' : 'Не назначен'}</small>}{user.universityIds.length > 2 && <span>+{user.universityIds.length - 2}</span>}</>}</div><span className="user-last-active">{user.lastActive ? new Date(user.lastActive).toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Ещё не входил'}</span><span className={`user-status ${user.status}`}>{user.status === 'invited' ? 'Ожидает входа' : statusLabels[user.status]}</span><div className="user-row-actions">{user.status === 'invited' && <><button disabled={saving} onClick={() => void createFreshInvite(user)}>Ссылка</button><button disabled={saving} onClick={() => void revokeInvite(user)}>Отозвать</button></>}<button className={user.role === 'user' ? 'assign' : ''} onClick={() => openEdit(user)}>{user.role === 'user' ? 'Назначить роль' : 'Изменить'}</button><button className={user.status === 'blocked' ? 'restore' : 'block'} disabled={saving} onClick={() => void toggleBlocked(user)}>{user.status === 'blocked' ? 'Разблокировать' : 'Блокировать'}</button></div></article>)}{!filtered.length && <p className="empty-state">Пользователи не найдены.</p>}</div></section>
    {(creating || editing) && <div className="crm-overlay" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) closeModal() }}><section className="crm-modal user-modal" role="dialog" aria-modal="true" aria-labelledby="user-modal-title"><div className="modal-heading"><div><div className="eyebrow">{editing ? 'УЧЕБНАЯ РОЛЬ И ДОСТУП' : 'ПЕРСОНАЛЬНОЕ ПРИГЛАШЕНИЕ'}</div><h2 id="user-modal-title">{editing ? editing.name : 'Пригласить пользователя'}</h2></div><button className="modal-close" onClick={closeModal} aria-label="Закрыть">×</button></div><form onSubmit={submit}><fieldset disabled={saving}><label>ФИО<input required maxLength={160} value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} /></label><label>Email<input required type="email" disabled={!!editing} value={form.email} onChange={event => setForm(current => ({ ...current, email: event.target.value }))} placeholder="user@example.ru" /></label><label>Роль<select value={form.role} onChange={event => { const nextRole = event.target.value as UserRole; setForm(current => ({ ...current, role: nextRole, universityIds: nextRole === 'admin' || nextRole === 'user' ? [] : current.universityIds.slice(0, nextRole === 'manager' ? undefined : 1) })) }}>{allowedRoles.map(value => <option key={value} value={value}>{roleLabels[value]}</option>)}</select></label>{form.role !== 'admin' && form.role !== 'user' && <fieldset className="university-access-field"><legend>{form.role === 'manager' ? 'Доступные вузы' : 'Учебное заведение'}</legend>{universities.map(university => <label key={university.id}><input type={form.role === 'manager' ? 'checkbox' : 'radio'} name="university" checked={form.universityIds.includes(university.id)} onChange={() => selectUniversity(university.id)} /><span><strong>{university.shortName}</strong><small>{university.name}</small></span></label>)}</fieldset>}<div className="assignment-preview"><span>После сохранения</span><strong>{roleLabels[form.role]}{selectedUniversity ? ` · ${selectedUniversity.shortName}` : ''}</strong><small>{form.role === 'student' ? 'Пользователь выберет программу и заполнит учебные данные при первом входе.' : form.role === 'teacher' ? 'Откроются программы и студенты назначенного вуза.' : 'Интерфейс и права изменятся в соответствии с ролью.'}</small></div><p className="invite-note">{editing ? 'Новый кабинет станет доступен после повторного входа или обновления сессии пользователя.' : 'Backend создаст одноразовое приглашение. Пользователь перейдёт по персональной ссылке и задаст логин и пароль.'}</p><div className="modal-actions"><button type="button" className="task-action" onClick={closeModal}>Отмена</button><button type="submit" className="primary-button">{saving ? 'Сохранение…' : editing ? editing.role === 'user' ? 'Назначить роль' : 'Сохранить' : 'Создать приглашение'}</button></div></fieldset>{error && <p className="form-error" role="alert">{error}</p>}</form></section></div>}
  </div>
}

function UserKpi({ label, value, tone = '' }: { label: string; value: number; tone?: string }) { return <article className={`card user-kpi ${tone}`}><span>{label}</span><strong>{value}</strong></article> }
