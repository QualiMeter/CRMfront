import { useEffect, useState } from 'react'
import {
  acceptInvitation,
  login,
  register,
  validateInvitation,
  type AuthSession,
  type InvitationInfo,
} from '../api/auth'

function tokenFromLocation() {
  const url = new URL(window.location.href)
  const queryToken = url.searchParams.get('token')
  if (queryToken) return queryToken
  const match = url.pathname.match(/^\/(?:invite|accept-invite)\/([^/]+)$/)
  return match ? decodeURIComponent(match[1]) : ''
}

export function AuthPage({ onAuthenticated }: { onAuthenticated: (session: AuthSession) => void }) {
  const inviteToken = tokenFromLocation()
  const initialRegister = window.location.pathname === '/register'
  const [mode, setMode] = useState<'login' | 'register'>(() => initialRegister ? 'register' : 'login')
  const [form, setForm] = useState({ username: '', email: '', password: '', firstName: '', lastName: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [inviteInfo, setInviteInfo] = useState<InvitationInfo | null>(null)
  const [checkingInvite, setCheckingInvite] = useState(Boolean(inviteToken))

  useEffect(() => {
    if (!inviteToken) return
    let cancelled = false
    setCheckingInvite(true)
    validateInvitation(inviteToken)
      .then(info => { if (!cancelled) setInviteInfo(info) })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Приглашение недействительно') })
      .finally(() => { if (!cancelled) setCheckingInvite(false) })
    return () => { cancelled = true }
  }, [inviteToken])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const session = inviteToken
        ? await acceptInvitation(inviteToken, form.username, form.password)
        : mode === 'login'
          ? await login(form.username, form.password)
          : await register({ username: form.username, email: form.email, password: form.password, first_name: form.firstName, last_name: form.lastName })
      window.history.replaceState({}, '', '/')
      onAuthenticated(session)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось выполнить запрос')
    } finally {
      setSaving(false)
    }
  }

  function switchMode() {
    const next = mode === 'login' ? 'register' : 'login'
    setMode(next)
    setError('')
    window.history.replaceState({}, '', next === 'register' ? '/register' : '/')
  }

  if (inviteToken && checkingInvite) {
    return <main className="auth-page"><section className="auth-card"><div className="auth-brand"><span>Р</span><div><strong>RTK Education</strong><small>CRM Platform</small></div></div><div className="auth-invite-state"><div className="eyebrow">ПРОВЕРКА ПРИГЛАШЕНИЯ</div><h1>Подождите немного</h1><p>Проверяем ссылку и срок её действия…</p></div></section></main>
  }

  if (inviteToken && (!inviteInfo?.valid || error && !inviteInfo)) {
    return <main className="auth-page"><section className="auth-card"><div className="auth-brand"><span>Р</span><div><strong>RTK Education</strong><small>CRM Platform</small></div></div><div className="auth-invite-state invalid"><div className="eyebrow">ПРИГЛАШЕНИЕ НЕДЕЙСТВИТЕЛЬНО</div><h1>Ссылка не работает</h1><p>{error || 'Приглашение уже использовано, отозвано или срок его действия закончился.'}</p><button className="primary-button auth-submit" onClick={() => { window.history.replaceState({}, '', '/'); window.location.reload() }}>Перейти ко входу</button></div></section></main>
  }

  const invitationMode = Boolean(inviteToken && inviteInfo?.valid)
  return <main className="auth-page"><section className="auth-card">
    <div className="auth-brand"><span>Р</span><div><strong>RTK Education</strong><small>CRM Platform</small></div></div>
    <div>
      <div className="eyebrow">{invitationMode ? 'ПЕРСОНАЛЬНОЕ ПРИГЛАШЕНИЕ' : mode === 'login' ? 'ДОБРО ПОЖАЛОВАТЬ' : 'НОВАЯ УЧЁТНАЯ ЗАПИСЬ'}</div>
      <h1>{invitationMode ? 'Создание аккаунта' : mode === 'login' ? 'Вход в систему' : 'Регистрация'}</h1>
      <p>{invitationMode ? `Для ${inviteInfo?.fullName || inviteInfo?.email}. Придумайте логин и пароль — роль и вуз уже назначены.` : mode === 'login' ? 'Введите данные учётной записи' : 'После регистрации менеджер назначит вам роль студента или преподавателя'}</p>
    </div>
    {invitationMode && <div className="invite-identity"><span>Приглашение для</span><strong>{inviteInfo?.fullName || 'Новый пользователь'}</strong><small>{inviteInfo?.email}{inviteInfo?.expiresAt ? ` · до ${new Date(inviteInfo.expiresAt).toLocaleDateString('ru-RU')}` : ''}</small></div>}
    <form onSubmit={submit}><fieldset disabled={saving}>
      {!invitationMode && mode === 'register' && <div className="auth-grid"><label>Имя<input required value={form.firstName} onChange={e => setForm(v => ({ ...v, firstName: e.target.value }))} /></label><label>Фамилия<input required value={form.lastName} onChange={e => setForm(v => ({ ...v, lastName: e.target.value }))} /></label></div>}
      <label>Логин<input autoFocus required minLength={3} pattern="[a-zA-Z0-9._-]+" value={form.username} onChange={e => setForm(v => ({ ...v, username: e.target.value }))} /></label>
      {!invitationMode && mode === 'register' && <label>Email<input required type="email" value={form.email} onChange={e => setForm(v => ({ ...v, email: e.target.value }))} /></label>}
      <label>Пароль<input required type="password" minLength={invitationMode || mode === 'register' ? 8 : 1} value={form.password} onChange={e => setForm(v => ({ ...v, password: e.target.value }))} /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary-button auth-submit">{saving ? 'Подождите…' : invitationMode ? 'Принять приглашение' : mode === 'login' ? 'Войти' : 'Создать аккаунт'}</button>
    </fieldset></form>
    {!invitationMode && <button className="auth-switch" onClick={switchMode}>{mode === 'login' ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}</button>}
  </section></main>
}
