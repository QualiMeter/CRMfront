import { useState } from 'react'
import { Icon } from '../components/Icon'
import { getProfile, profileInitials, saveProfile, type CrmProfile } from '../profile'
import type { AuthUser } from '../api/auth'

const roleNames: Record<string, string> = { user: 'Ожидает роли', student: 'Студент', teacher: 'Преподаватель', manager: 'Менеджер', admin: 'Администратор' }

function profileFromUser(user: AuthUser): CrmProfile {
  const preferences = getProfile()
  return {
    ...preferences,
    name: user.full_name || user.username,
    role: user.roles.map(role => roleNames[role] ?? role).join(', ') || 'Пользователь',
    email: user.email,
    department: '',
    phone: '',
  }
}

export function ProfilePage({ onOpenSettings, currentUser }: { onOpenSettings: () => void; currentUser: AuthUser }) {
  const backendProfile = profileFromUser(currentUser)
  const [profile, setProfile] = useState<CrmProfile>(backendProfile)
  const [message, setMessage] = useState('')

  function togglePreference(field: 'taskNotifications' | 'overdueNotifications') {
    const next = { ...profile, [field]: !profile[field] }
    setProfile(next)
    saveProfile(next)
    setMessage('Настройки уведомлений обновлены')
  }

  return <div className="content profile-page">
    <div className="page-heading">
      <div><div className="eyebrow">УЧЁТНАЯ ЗАПИСЬ</div><h1>Мой профиль</h1><p className="muted">Контактные данные и персональные настройки CRM</p></div>
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
        <dl className="profile-details-list">
          <div><dt>Имя</dt><dd>{profile.name}</dd></div>
          <div><dt>Роль</dt><dd>{profile.role}</dd></div>
          <div><dt>Почта</dt><dd><a href={`mailto:${profile.email}`}>{profile.email}</a></dd></div>
          <div><dt>Логин</dt><dd>{currentUser.username}</dd></div>
        </dl>
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
        <div className="profile-interface-copy"><Icon name="settings" size={22} /><div><strong>Настройки интерфейса</strong><p>Компактный режим и пояснения находятся в отдельной панели.</p></div></div>
        <button className="outline-button profile-settings-button" onClick={onOpenSettings}>Открыть настройки</button>
      </section>
    </div>
  </div>
}
