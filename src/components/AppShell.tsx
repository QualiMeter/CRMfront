import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Icon } from './Icon'
import { profileInitials } from '../profile'
import type { AuthUser } from '../api/auth'

const crmNavItems = [
  { label: 'Обзор', icon: 'grid' as const, path: '/' },
  { label: 'Вузы', icon: 'building' as const, path: '/universities' },
  { label: 'Программы', icon: 'book' as const, path: '/programs' },
  { label: 'Аналитика', icon: 'chart' as const, path: '/analytics' },
]
const crmSecondaryItems = [
  { label: 'Отчеты', icon: 'file' as const, path: '/reports' },
  { label: 'Импорт', icon: 'plus' as const, path: '/import' },
  { label: 'Процессы', icon: 'grid' as const, path: '/workflows' },
  { label: 'Пользователи', icon: 'users' as const, path: '/users' },
  { label: 'Задачи', icon: 'check' as const, path: '/tasks' },
  { label: 'Документы', icon: 'file' as const, path: '/documents' },
]
const studentNavItems = [
  { label: 'Мой кабинет', icon: 'grid' as const, path: '/' },
  { label: 'Моя программа', icon: 'book' as const, path: '/my-program' },
  { label: 'Материалы', icon: 'file' as const, path: '/documents' },
  { label: 'Мой профиль', icon: 'users' as const, path: '/profile' },
]
const teacherNavItems = [
  { label: 'Мой кабинет', icon: 'grid' as const, path: '/' },
  { label: 'Программы', icon: 'book' as const, path: '/programs' },
  { label: 'Студенты', icon: 'users' as const, path: '/students' },
  { label: 'Мой профиль', icon: 'users' as const, path: '/profile' },
]
const waitingNavItems = [
  { label: 'Статус аккаунта', icon: 'clock' as const, path: '/' },
  { label: 'Мой профиль', icon: 'users' as const, path: '/profile' },
]
const roleLabels: Record<string, string> = { user: 'Ожидает роли', student: 'Студент', teacher: 'Преподаватель', manager: 'Менеджер', admin: 'Администратор' }

function primaryRole(roles: string[]) {
  return roles.includes('admin') ? 'admin' : roles.includes('manager') ? 'manager' : roles.includes('teacher') ? 'teacher' : roles.includes('student') ? 'student' : 'user'
}

function breadcrumb(path: string) {
  const map: Record<string, string> = {'/':'Обзор','/profile':'Мой профиль','/universities':'Вузы','/programs':'Программы','/my-program':'Моя программа','/students':'Студенты','/analytics':'Аналитика','/reports':'Отчеты','/import':'Импорт','/workflows':'Процессы','/users':'Пользователи','/tasks':'Задачи','/documents':'Документы'}
  return path.startsWith('/universities/') ? 'Карточка вуза' : map[path] ?? 'Раздел'
}

export function AppShell({ children, path, navigate, taskCount, settingsSignal = 0, currentUser, onLogout }: { taskCount: number; children: ReactNode; path: string; navigate: (path: string) => void; settingsSignal?: number; currentUser: AuthUser; onLogout: () => Promise<void> }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [compact, setCompact] = useState(() => localStorage.getItem('crm-density') === 'compact')
  const [tips, setTips] = useState(() => localStorage.getItem('crm-tips') !== 'off')
  const [search, setSearch] = useState('')
  const menuButton = useRef<HTMLButtonElement>(null)
  const profileMenuRef = useRef<HTMLDivElement>(null)
  const displayName = currentUser.full_name || currentUser.username
  const initials = profileInitials(displayName)
  const isAdmin = currentUser.roles.includes('admin')
  const isManager = currentUser.roles.includes('manager')
  const activeRole = primaryRole(currentUser.roles)
  const canManageContent = isAdmin || isManager
  const canManageUsers = isAdmin || isManager
  const navItems = activeRole === 'student' ? studentNavItems : activeRole === 'teacher' ? teacherNavItems : activeRole === 'user' ? waitingNavItems : crmNavItems
  const breadcrumbLabel = path === '/' && activeRole === 'student' ? 'Мой кабинет' : path === '/' && activeRole === 'teacher' ? 'Кабинет преподавателя' : path === '/' && activeRole === 'user' ? 'Статус аккаунта' : breadcrumb(path)
  const visibleSecondaryItems = canManageContent ? crmSecondaryItems.filter(item => {
    if (item.path === '/users') return canManageUsers
    if (item.path === '/import' || item.path === '/workflows') return canManageContent
    return true
  }) : []

  useEffect(() => { setMenuOpen(false); setNotificationsOpen(false); setProfileMenuOpen(false) }, [path])
  useEffect(() => { if (settingsSignal > 0) setSettingsOpen(true) }, [settingsSignal])
  useEffect(() => { document.documentElement.dataset.density = compact ? 'compact' : 'comfortable' }, [compact])
  useEffect(() => { document.documentElement.dataset.tips = tips ? 'on' : 'off' }, [tips])
  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) setProfileMenuOpen(false)
    }
    if (profileMenuOpen) document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [profileMenuOpen])

  function closeMenu() { setMenuOpen(false); menuButton.current?.focus() }
  const isActive = (itemPath: string) => itemPath === '/' ? path === '/' : path.startsWith(itemPath)
  const submitSearch = () => {
    const value = search.trim().toLowerCase()
    if (!value) return
    if (value.includes('зада')) navigate('/tasks')
    else if (value.includes('док')) navigate('/documents')
    else if (value.includes('анал')) navigate('/analytics')
    else if (value.includes('отч')) navigate('/reports')
    else if ((value.includes('импорт') || value.includes('excel')) && canManageContent) navigate('/import')
    else if ((value.includes('процесс') || value.includes('workflow')) && canManageContent) navigate('/workflows')
    else if ((value.includes('пользов') || value.includes('сотруд') || value.includes('роль') || value.includes('студент')) && canManageUsers) navigate('/users')
    else if (value.includes('программ') || value.includes('курс')) navigate('/programs')
    else if (value.includes('профил') || value.includes('аккаунт')) navigate('/profile')
    else if (value.includes('вуз') || value.includes('универ')) navigate('/universities')
    else navigate(`/universities?search=${encodeURIComponent(search.trim())}`)
    setSearch('')
  }
  const saveSettings = () => {
    localStorage.setItem('crm-density', compact ? 'compact' : 'comfortable')
    localStorage.setItem('crm-tips', tips ? 'on' : 'off')
    setSettingsOpen(false)
  }
  const toggleCompact = () => {
    const next = !compact
    setCompact(next)
    localStorage.setItem('crm-density', next ? 'compact' : 'comfortable')
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">Р</div><div><div className="brand-name">RTK Education</div><div className="brand-subtitle">CRM Platform</div></div></div>
      <div className="sidebar-label">{canManageContent ? 'РАБОЧЕЕ ПРОСТРАНСТВО' : activeRole === 'student' ? 'ОБУЧЕНИЕ' : activeRole === 'teacher' ? 'ПРЕПОДАВАНИЕ' : 'УЧЁТНАЯ ЗАПИСЬ'}</div>
      <nav className="nav-list" aria-label="Навигация">{navItems.map((item) => <button key={item.path} className={`nav-item ${isActive(item.path) ? 'active' : ''}`} onClick={() => navigate(item.path)}><Icon name={item.icon} size={19} /><span>{item.label}</span></button>)}</nav>
      {visibleSecondaryItems.length > 0 && <><div className="sidebar-label second">УПРАВЛЕНИЕ</div><nav className="nav-list" aria-label="Навигация">{visibleSecondaryItems.map((item) => <button key={item.path} className={`nav-item ${isActive(item.path) ? 'active' : ''}`} onClick={() => navigate(item.path)}><Icon name={item.icon} size={19} /><span>{item.label}</span>{item.path === '/tasks' && <span className="nav-badge">{taskCount}</span>}</button>)}</nav></>}
      <div className="sidebar-bottom">
        <button className="nav-item" onClick={() => setSettingsOpen(true)}><Icon name="settings" size={19} /><span>Настройки</span></button>
        <button className="nav-item logout-nav-item" onClick={() => void onLogout()}><Icon name="arrow" size={19} /><span>Выйти из аккаунта</span></button>
        <div className="user-card" ref={profileMenuRef}>
          <button className="user-main-button" onClick={() => navigate('/profile')} aria-label="Открыть мой профиль"><div className="avatar">{initials}</div><div className="user-meta"><strong>{displayName}</strong><span>{currentUser.roles.map(role => roleLabels[role] ?? role).join(', ') || 'Пользователь'}</span></div></button>
          <button className="user-more-button" aria-label="Меню профиля" aria-expanded={profileMenuOpen} onClick={() => setProfileMenuOpen(open => !open)}><Icon name="more" size={18} /></button>
          {profileMenuOpen && <div className="profile-menu" role="menu">
            <button role="menuitem" onClick={() => navigate('/profile')}><span className="profile-menu-icon">{initials}</span><span><strong>Мой профиль</strong><small>{currentUser.email}</small></span></button>
      <button role="menuitem" onClick={() => { setProfileMenuOpen(false); setSettingsOpen(true) }}><Icon name="settings" size={17} /><span><strong>Настройки интерфейса</strong><small>Вид и пояснения</small></span></button>
            <button role="menuitem" onClick={() => { toggleCompact(); setProfileMenuOpen(false) }}><Icon name="grid" size={17} /><span><strong>Компактный режим</strong><small>{compact ? 'Сейчас включён' : 'Сейчас выключен'}</small></span><b className={`menu-switch ${compact ? 'on' : ''}`} aria-hidden="true" /> </button>
            <button role="menuitem" onClick={() => void onLogout()}><Icon name="arrow" size={17} /><span><strong>Выйти</strong><small>{currentUser.email}</small></span></button>
          </div>}
        </div>
      </div>
    </aside>
    <main className="main"><header className="topbar"><div className="topbar-leading"><button ref={menuButton} className="mobile-menu-button" aria-expanded={menuOpen} aria-controls="mobile-navigation" aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'} onClick={() => setMenuOpen(open => !open)}><span aria-hidden="true">{menuOpen ? '×' : '☰'}</span></button><div className="breadcrumbs"><span>CRM</span><span>/</span><strong>{breadcrumbLabel}</strong></div></div><div className="topbar-actions">{canManageContent && <form className="search" onSubmit={event => { event.preventDefault(); submitSearch() }}><Icon name="search" size={18} /><input aria-label="Поиск" value={search} onChange={event => setSearch(event.target.value)} placeholder="Поиск..." /></form>}{canManageContent && <div className="notification-wrap"><button className="icon-button" aria-label="Уведомления" aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen(open => !open)}><Icon name="bell" size={19} />{taskCount > 0 && <span className="notification-dot" />}</button>{notificationsOpen && <div className="top-popover"><strong>Уведомления</strong><p>{taskCount ? `Открытых задач: ${taskCount}. Проверьте сроки и ответственных.` : 'Новых уведомлений нет.'}</p><button className="popover-action" onClick={() => navigate('/tasks')}>Перейти к задачам <Icon name="arrow" size={14} /></button></div>}</div>}<button className="top-avatar top-avatar-button" aria-label="Открыть мой профиль" onClick={() => navigate('/profile')}>{initials}</button></div></header>{menuOpen && <nav id="mobile-navigation" className="mobile-navigation" aria-label="Разделы CRM" onKeyDown={event => { if (event.key === 'Escape') closeMenu() }}>
      {[...navItems, ...visibleSecondaryItems].map(item => <button key={item.path} aria-current={isActive(item.path) ? 'page' : undefined} className={`nav-item ${isActive(item.path) ? 'active' : ''}`} onClick={() => { closeMenu(); navigate(item.path) }}><Icon name={item.icon} size={20} />{item.label}{item.path === '/tasks' && <span className="nav-badge">{taskCount}</span>}</button>)}
      {canManageContent && <button className={`nav-item ${path === '/profile' ? 'active' : ''}`} onClick={() => { closeMenu(); navigate('/profile') }}><span className="mobile-profile-mark">{initials}</span>Мой профиль</button>}
      <button className="nav-item" onClick={() => { closeMenu(); setSettingsOpen(true) }}><Icon name="settings" size={20} />Настройки</button>
      <button className="nav-item logout-nav-item" onClick={() => { closeMenu(); void onLogout() }}><Icon name="arrow" size={20} />Выйти из аккаунта</button>
    </nav>}{children}</main>
    {settingsOpen && <div className="crm-overlay" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setSettingsOpen(false) }}><section className="crm-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title"><div className="modal-heading"><div><div className="eyebrow">ПЕРСОНАЛИЗАЦИЯ</div><h2 id="settings-title">Настройки интерфейса</h2></div><button className="modal-close" aria-label="Закрыть" onClick={() => setSettingsOpen(false)}>×</button></div><div className="settings-list"><label><span><strong>Компактный режим</strong><small>Уменьшает вертикальные отступы на рабочих экранах.</small></span><input type="checkbox" checked={compact} onChange={event => setCompact(event.target.checked)} /></label><label><span><strong>Пояснения</strong><small>Показывать технические пояснения на рабочих экранах.</small></span><input type="checkbox" checked={tips} onChange={event => setTips(event.target.checked)} /></label></div><div className="modal-actions"><button className="task-action" onClick={() => setSettingsOpen(false)}>Отмена</button><button className="primary-button" onClick={saveSettings}>Сохранить</button></div></section></div>}
  </div>
}
