import type { ReactNode } from 'react'
import { Icon } from './Icon'

const navItems = [
  { label: 'Обзор', icon: 'grid' as const, path: '/' },
  { label: 'Вузы', icon: 'building' as const, path: '/universities' },
  { label: 'Программы', icon: 'book' as const, path: '/programs' },
  { label: 'Аналитика', icon: 'chart' as const, path: '/analytics' },
]
const secondaryItems = [
  { label: 'Задачи', icon: 'check' as const, path: '/tasks', badge: '7' },
  { label: 'Документы', icon: 'file' as const, path: '/documents' },
]

export function AppShell({ children, path, navigate }: { children: ReactNode; path: string; navigate: (path: string) => void }) {
  const isActive = (itemPath: string) => itemPath === '/' ? path === '/' : path.startsWith(itemPath)
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">Р</div><div><div className="brand-name">RTK Education</div><div className="brand-subtitle">CRM Platform</div></div></div>
      <div className="sidebar-label">РАБОЧЕЕ ПРОСТРАНСТВО</div>
      <nav className="nav-list">{navItems.map((item) => <button key={item.path} className={`nav-item ${isActive(item.path) ? 'active' : ''}`} onClick={() => navigate(item.path)}><Icon name={item.icon} size={19} /><span>{item.label}</span></button>)}</nav>
      <div className="sidebar-label second">УПРАВЛЕНИЕ</div>
      <nav className="nav-list">{secondaryItems.map((item) => <button key={item.path} className={`nav-item ${isActive(item.path) ? 'active' : ''}`} onClick={() => navigate(item.path)}><Icon name={item.icon} size={19} /><span>{item.label}</span>{item.badge && <span className="nav-badge">{item.badge}</span>}</button>)}</nav>
      <div className="sidebar-bottom"><button className="nav-item"><Icon name="settings" size={19} /><span>Настройки</span></button><div className="user-card"><div className="avatar">АП</div><div className="user-meta"><strong>Алексей Петров</strong><span>Менеджер</span></div><Icon name="more" size={18} /></div></div>
    </aside>
    <main className="main"><header className="topbar"><div className="breadcrumbs"><span>CRM</span><span>/</span><strong>{path.startsWith('/universities') ? 'Вузы' : path === '/' ? 'Обзор' : 'Раздел'}</strong></div><div className="topbar-actions"><div className="search"><Icon name="search" size={18} /><input placeholder="Поиск..." /></div><button className="icon-button"><Icon name="bell" size={19} /><span className="notification-dot" /></button><div className="top-avatar">АП</div></div></header>{children}</main>
  </div>
}
