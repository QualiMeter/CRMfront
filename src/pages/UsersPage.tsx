import { useMemo, useState, type FormEvent } from 'react'
import { Icon } from '../components/Icon'
import type { CrmUser, CrmUserInput, CrmUserUpdate, University, UserRole } from '../types/domain'
import '../users.css'

const roleLabels: Record<UserRole, string> = { user: 'Пользователь', manager: 'Менеджер', admin: 'Администратор' }
const statusLabels: Record<CrmUser['status'], string> = { active: 'Активен', invited: 'Приглашён', blocked: 'Заблокирован' }
const emptyForm = (): CrmUserInput => ({ name: '', email: '', role: 'user', universityIds: [] })

export function UsersPage({ users, universities, onCreate, onUpdate }: {
  users: CrmUser[]
  universities: University[]
  onCreate: (input: CrmUserInput) => Promise<void>
  onUpdate: (id: number, update: CrmUserUpdate) => Promise<void>
}) {
  const [query, setQuery] = useState('')
  const [role, setRole] = useState<UserRole | 'all'>('all')
  const [status, setStatus] = useState<CrmUser['status'] | 'all'>('all')
  const [editing, setEditing] = useState<CrmUser | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<CrmUserInput>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const filtered = useMemo(() => users.filter(user => {
    const search = query.trim().toLowerCase()
    return (!search || `${user.name} ${user.email}`.toLowerCase().includes(search)) && (role === 'all' || user.role === role) && (status === 'all' || user.status === status)
  }), [users, query, role, status])
  const stats = useMemo(() => ({ active: users.filter(user => user.status === 'active').length, managers: users.filter(user => user.role === 'manager').length, admins: users.filter(user => user.role === 'admin').length, invited: users.filter(user => user.status === 'invited').length }), [users])

  function openCreate() { setCreating(true); setEditing(null); setForm(emptyForm()); setError(''); setMessage('') }
  function openEdit(user: CrmUser) { setEditing(user); setCreating(false); setForm({ name: user.name, email: user.email, role: user.role, universityIds: [...user.universityIds] }); setError(''); setMessage('') }
  function closeModal() { if (!saving) { setCreating(false); setEditing(null); setError('') } }
  function toggleUniversity(id: number) { setForm(current => ({ ...current, universityIds: current.universityIds.includes(id) ? current.universityIds.filter(item => item !== id) : [...current.universityIds, id] })) }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (saving) return
    setSaving(true); setError('')
    try {
      if (editing) { await onUpdate(editing.id, { name: form.name, role: form.role, universityIds: form.universityIds }); setMessage('Права пользователя обновлены.') }
      else { await onCreate(form); setMessage('Приглашение создано. После подключения Keycloak письмо будет отправляться автоматически.') }
      closeModal(); setCreating(false); setEditing(null)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось сохранить пользователя') }
    finally { setSaving(false) }
  }
  async function toggleBlocked(user: CrmUser) {
    const next = user.status === 'blocked' ? 'active' : 'blocked'
    if (next === 'blocked' && !window.confirm(`Заблокировать пользователя «${user.name}»?`)) return
    setSaving(true); setError(''); setMessage('')
    try { await onUpdate(user.id, { status: next }); setMessage(next === 'blocked' ? 'Доступ пользователя заблокирован.' : 'Доступ пользователя восстановлен.') }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось изменить статус') }
    finally { setSaving(false) }
  }

  return <div className="content users-workspace">
    <div className="page-heading"><div><div className="eyebrow">ДОСТУП И РОЛИ</div><h1>Пользователи</h1><p className="muted">Управление сотрудниками и доступом к данным учебных заведений</p></div><button className="primary-button" onClick={openCreate}><Icon name="plus" size={17} /> Пригласить пользователя</button></div>
    <section className="users-kpis"><UserKpi label="Всего" value={users.length} /><UserKpi label="Активные" value={stats.active} tone="green" /><UserKpi label="Менеджеры" value={stats.managers} /><UserKpi label="Администраторы" value={stats.admins} /><UserKpi label="Ожидают входа" value={stats.invited} tone="orange" /></section>
    <section className="card users-role-guide"><div><strong>Пользователь</strong><span>Работа с назначенными вузами</span></div><div><strong>Менеджер</strong><span>Расширенный доступ и назначение ответственных</span></div><div><strong>Администратор</strong><span>Все данные, роли и настройки системы</span></div></section>
    <section className="card users-card"><div className="users-toolbar"><label className="list-search"><Icon name="search" size={17} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Поиск по имени или email" /></label><select value={role} onChange={event => setRole(event.target.value as UserRole | 'all')}><option value="all">Все роли</option>{Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><select value={status} onChange={event => setStatus(event.target.value as CrmUser['status'] | 'all')}><option value="all">Все статусы</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><div className="users-table"><div className="users-head"><span>Сотрудник</span><span>Роль</span><span>Доступ к вузам</span><span>Последняя активность</span><span>Статус</span><span /></div>{filtered.map(user => <article key={user.id} className={user.status === 'blocked' ? 'blocked' : ''}><div className="users-person"><span>{user.name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()}</span><div><strong>{user.name}</strong><small>{user.email}</small></div></div><span className={`user-role ${user.role}`}>{roleLabels[user.role]}</span><div className="user-access">{user.role === 'admin' ? <strong>Все вузы</strong> : <>{user.universityIds.slice(0, 2).map(id => <span key={id}>{universities.find(item => item.id === id)?.shortName ?? `#${id}`}</span>)}{user.universityIds.length > 2 && <span>+{user.universityIds.length - 2}</span>}</>}</div><span className="user-last-active">{user.lastActive ? new Date(user.lastActive).toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Ещё не входил'}</span><span className={`user-status ${user.status}`}>{statusLabels[user.status]}</span><div className="user-row-actions"><button onClick={() => openEdit(user)}>Изменить</button><button className={user.status === 'blocked' ? 'restore' : 'block'} disabled={saving} onClick={() => void toggleBlocked(user)}>{user.status === 'blocked' ? 'Разблокировать' : 'Блокировать'}</button></div></article>)}{!filtered.length && <p className="empty-state">Пользователи не найдены.</p>}</div></section>
    {message && <p className="users-feedback success" role="status">{message}</p>}{error && !creating && !editing && <p className="users-feedback error" role="alert">{error}</p>}
    {(creating || editing) && <div className="crm-overlay" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) closeModal() }}><section className="crm-modal user-modal" role="dialog" aria-modal="true" aria-labelledby="user-modal-title"><div className="modal-heading"><div><div className="eyebrow">{editing ? 'РЕДАКТИРОВАНИЕ ДОСТУПА' : 'НОВЫЙ ПОЛЬЗОВАТЕЛЬ'}</div><h2 id="user-modal-title">{editing ? editing.name : 'Пригласить сотрудника'}</h2></div><button className="modal-close" onClick={closeModal} aria-label="Закрыть">×</button></div><form onSubmit={submit}><fieldset disabled={saving}><label>ФИО<input maxLength={160} value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} /></label><label>Email<input type="email" disabled={!!editing} value={form.email} onChange={event => setForm(current => ({ ...current, email: event.target.value }))} placeholder="user@company.ru" /></label><label>Роль<select value={form.role} onChange={event => setForm(current => ({ ...current, role: event.target.value as UserRole, universityIds: event.target.value === 'admin' ? [] : current.universityIds }))}>{Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>{form.role !== 'admin' && <fieldset className="university-access-field"><legend>Доступ к вузам</legend>{universities.map(university => <label key={university.id}><input type="checkbox" checked={form.universityIds.includes(university.id)} onChange={() => toggleUniversity(university.id)} /><span><strong>{university.shortName}</strong><small>{university.name}</small></span></label>)}</fieldset>}<p className="keycloak-note">В рабочей версии учётная запись и пароль создаются в Keycloak. CRM хранит роль и область доступа.</p><div className="modal-actions"><button type="button" className="task-action" onClick={closeModal}>Отмена</button><button type="submit" className="primary-button">{saving ? 'Сохранение…' : editing ? 'Сохранить' : 'Создать приглашение'}</button></div></fieldset>{error && <p className="form-error" role="alert">{error}</p>}</form></section></div>}
  </div>
}

function UserKpi({ label, value, tone = '' }: { label: string; value: number; tone?: string }) { return <article className={`card user-kpi ${tone}`}><span>{label}</span><strong>{value}</strong></article> }
