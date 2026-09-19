import { useState, type FormEvent } from 'react'
import { login, register, type AuthSession } from '../api/auth'

export function AuthPage({ onAuthenticated }: { onAuthenticated: (session: AuthSession) => void }) {
  const inviteRegistration = window.location.pathname === '/register'
  const [mode, setMode] = useState<'login' | 'register'>(() => inviteRegistration ? 'register' : 'login')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ username: '', email: '', password: '', firstName: '', lastName: '' })
  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError('')
    try {
      const session = mode === 'login'
        ? await login(form.username, form.password)
        : await register({ username: form.username, email: form.email, password: form.password, first_name: form.firstName, last_name: form.lastName })
      window.history.replaceState({}, '', '/')
      onAuthenticated(session)
    } catch (error) { setError(error instanceof Error ? error.message : 'Не удалось выполнить вход') }
    finally { setSaving(false) }
  }
  const switchMode = () => {
    const next = mode === 'login' ? 'register' : 'login'
    setMode(next)
    setError('')
    window.history.replaceState({}, '', next === 'register' ? '/register' : '/')
  }
  return <main className="auth-page"><section className="auth-card"><div className="auth-brand"><span>Р</span><div><strong>RTK Education</strong><small>CRM Platform</small></div></div><div><div className="eyebrow">{mode === 'login' ? 'ДОБРО ПОЖАЛОВАТЬ' : inviteRegistration ? 'ПРИГЛАШЕНИЕ В CRM' : 'НОВАЯ УЧЁТНАЯ ЗАПИСЬ'}</div><h1>{mode === 'login' ? 'Вход в систему' : 'Регистрация'}</h1><p>{mode === 'login' ? 'Введите данные учётной записи' : inviteRegistration ? 'Укажите email, на который администратор создал приглашение' : 'После регистрации администратор сможет изменить вашу роль'}</p></div><form onSubmit={submit}><fieldset disabled={saving}>{mode === 'register' && <div className="auth-grid"><label>Имя<input required value={form.firstName} onChange={e => setForm(v => ({ ...v, firstName: e.target.value }))} /></label><label>Фамилия<input required value={form.lastName} onChange={e => setForm(v => ({ ...v, lastName: e.target.value }))} /></label></div>}<label>Логин<input autoFocus required minLength={3} value={form.username} onChange={e => setForm(v => ({ ...v, username: e.target.value }))} /></label>{mode === 'register' && <label>Email<input required type="email" value={form.email} onChange={e => setForm(v => ({ ...v, email: e.target.value }))} /></label>}<label>Пароль<input required type="password" minLength={mode === 'register' ? 8 : 1} value={form.password} onChange={e => setForm(v => ({ ...v, password: e.target.value }))} /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button auth-submit">{saving ? 'Подождите…' : mode === 'login' ? 'Войти' : inviteRegistration ? 'Принять приглашение' : 'Создать аккаунт'}</button></fieldset></form><button className="auth-switch" onClick={switchMode}>{mode === 'login' ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}</button></section></main>
}
