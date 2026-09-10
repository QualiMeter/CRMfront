import { useState, type FormEvent } from 'react'
import { Icon } from '../components/Icon'
import { getProfile, profileInitials, saveProfile, type CrmProfile } from '../profile'

export function ProfilePage({ onOpenSettings }: { onOpenSettings: () => void }) {
  const [profile, setProfile] = useState<CrmProfile>(() => getProfile())
  const [draft, setDraft] = useState<CrmProfile>(() => getProfile())
  const [editing, setEditing] = useState(false)
  const [message, setMessage] = useState('')

  function startEditing() {
    setDraft(profile)
    setMessage('')
    setEditing(true)
  }

  function cancelEditing() {
    setDraft(profile)
    setEditing(false)
    setMessage('')
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    const next = {
      ...draft,
      name: draft.name.trim(),
      role: draft.role.trim(),
      department: draft.department.trim(),
      email: draft.email.trim(),
      phone: draft.phone.trim(),
    }
    if (!next.name || !next.role || !next.email) return
    saveProfile(next)
    setProfile(next)
    setDraft(next)
    setEditing(false)
    setMessage('Профиль сохранён')
  }

  function togglePreference(field: 'taskNotifications' | 'overdueNotifications') {
    const next = { ...profile, [field]: !profile[field] }
    setProfile(next)
    setDraft(next)
    saveProfile(next)
    setMessage('Настройки уведомлений обновлены')
  }

  return <div className="content profile-page">
    <div className="page-heading">
      <div><div className="eyebrow">УЧЁТНАЯ ЗАПИСЬ</div><h1>Мой профиль</h1><p className="muted">Контактные данные и персональные настройки CRM</p></div>
      {!editing && <button className="primary-button" onClick={startEditing}>Редактировать профиль</button>}
    </div>

    {message && <div className="profile-message" role="status">{message}</div>}

    <div className="profile-layout">
      <section className="card profile-summary-card">
        <div className="profile-avatar-large">{profileInitials(profile.name)}</div>
        <h2>{profile.name}</h2>
        <p>{profile.role}</p>
        <span>{profile.department}</span>
        <div className="profile-status"><i /> Профиль активен</div>
      </section>

      <section className="card profile-details-card">
        <div className="card-header"><div><h2>Основная информация</h2><p>Данные отображаются в интерфейсе CRM</p></div></div>
        {editing ? <form className="profile-form" onSubmit={submit}>
          <div className="profile-form-grid">
            <label>Имя и фамилия<input required maxLength={120} value={draft.name} onChange={event => setDraft(current => ({ ...current, name: event.target.value }))} /></label>
            <label>Роль<input required maxLength={80} value={draft.role} onChange={event => setDraft(current => ({ ...current, role: event.target.value }))} /></label>
            <label>Подразделение<input maxLength={120} value={draft.department} onChange={event => setDraft(current => ({ ...current, department: event.target.value }))} /></label>
            <label>Рабочая почта<input required type="email" maxLength={160} value={draft.email} onChange={event => setDraft(current => ({ ...current, email: event.target.value }))} /></label>
            <label>Телефон<input maxLength={40} value={draft.phone} onChange={event => setDraft(current => ({ ...current, phone: event.target.value }))} /></label>
          </div>
          <div className="profile-form-actions"><button type="button" className="task-action" onClick={cancelEditing}>Отмена</button><button className="primary-button" type="submit">Сохранить</button></div>
        </form> : <dl className="profile-details-list">
          <div><dt>Имя</dt><dd>{profile.name}</dd></div>
          <div><dt>Роль</dt><dd>{profile.role}</dd></div>
          <div><dt>Подразделение</dt><dd>{profile.department || 'Не указано'}</dd></div>
          <div><dt>Почта</dt><dd><a href={`mailto:${profile.email}`}>{profile.email}</a></dd></div>
          <div><dt>Телефон</dt><dd>{profile.phone || 'Не указан'}</dd></div>
        </dl>}
      </section>
    </div>

    <div className="profile-bottom-grid">
      <section className="card profile-preferences-card">
        <div className="card-header"><div><h2>Уведомления</h2><p>Какие события показывать в рабочем центре</p></div></div>
        <div className="profile-toggle-list">
          <button onClick={() => togglePreference('taskNotifications')}><span><strong>Новые и изменённые задачи</strong><small>Показывать обновления по поручениям</small></span><i className={profile.taskNotifications ? 'on' : ''}>{profile.taskNotifications ? 'Вкл.' : 'Выкл.'}</i></button>
          <button onClick={() => togglePreference('overdueNotifications')}><span><strong>Просроченные задачи</strong><small>Отдельно напоминать о нарушенных сроках</small></span><i className={profile.overdueNotifications ? 'on' : ''}>{profile.overdueNotifications ? 'Вкл.' : 'Выкл.'}</i></button>
        </div>
      </section>

      <section className="card profile-interface-card">
        <div className="card-header"><div><h2>Интерфейс</h2><p>Отображение рабочего пространства</p></div></div>
        <div className="profile-interface-copy"><Icon name="settings" size={22} /><div><strong>Настройки интерфейса</strong><p>Компактный режим и демо-подсказки находятся в отдельной панели.</p></div></div>
        <button className="outline-button profile-settings-button" onClick={onOpenSettings}>Открыть настройки</button>
      </section>
    </div>
  </div>
}
