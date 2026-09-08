import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Icon } from './Icon'

const navItems = [
  { label: 'Обзор', icon: 'grid' as const, path: '/' },
  { label: 'Вузы', icon: 'building' as const, path: '/universities' },
  { label: 'Программы', icon: 'book' as const, path: '/programs' },
  { label: 'Аналитика', icon: 'chart' as const, path: '/analytics' },
]
const secondaryItems = [
  { label: 'Задачи', icon: 'check' as const, path: '/tasks' },
  { label: 'Документы', icon: 'file' as const, path: '/documents' },
]

function breadcrumb(path: string) { const map: Record<string, string> = {'/':'Обзор','/universities':'Вузы','/programs':'Программы','/analytics':'Аналитика','/tasks':'Задачи','/documents':'Документы'}; return path.startsWith('/universities/') ? 'Карточка вуза' : map[path] ?? 'Раздел' }

export function AppShell({ children, path, navigate, taskCount }: { taskCount: number; children: ReactNode; path: string; navigate: (path: string) => void }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButton = useRef<HTMLButtonElement>(null)
  useEffect(() => { setMenuOpen(false) }, [path])
  function closeMenu() { setMenuOpen(false); menuButton.current?.focus() }
  const isActive = (itemPath: string) => itemPath === '/' ? path === '/' : path.startsWith(itemPath)
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">Р</div><div><div className="brand-name">RTK Education</div><div className="brand-subtitle">CRM Platform</div></div></div>
      <div className="sidebar-label">РАБОЧЕЕ ПРОСТРАНСТВО</div>
      <nav className="nav-list" aria-label="Навигация">{navItems.map((item) => <button key={item.path} className={`nav-item ${isActive(item.path) ? 'active' : ''}`} onClick={() => navigate(item.path)}><Icon name={item.icon} size={19} /><span>{item.label}</span></button>)}</nav>
      <div className="sidebar-label second">УПРАВЛЕНИЕ</div>
      <nav className="nav-list" aria-label="Навигация">{secondaryItems.map((item) => <button key={item.path} className={`nav-item ${isActive(item.path) ? 'active' : ''}`} onClick={() => navigate(item.path)}><Icon name={item.icon} size={19} /><span>{item.label}</span>{item.path === '/tasks' && <span className="nav-badge">{taskCount}</span>}</button>)}</nav>
      <div className="sidebar-bottom"><button className="nav-item disabled-nav" disabled title="Настройки добавим позже"><Icon name="settings" size={19} /><span>Настройки</span></button><div className="user-card"><div className="avatar">АП</div><div className="user-meta"><strong>Алексей Петров</strong><span>Менеджер</span></div><Icon name="more" size={18} /></div></div>
    </aside>
    <main className="main"><header className="topbar"><div className="topbar-leading"><button ref={menuButton} className="mobile-menu-button" aria-expanded={menuOpen} aria-controls="mobile-navigation" aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'} onClick={() => setMenuOpen(open => !open)}><span aria-hidden="true">{menuOpen ? '×' : '☰'}</span></button><div className="breadcrumbs"><span>CRM</span><span>/</span><strong>{breadcrumb(path)}</strong></div></div><div className="topbar-actions"><div className="search"><Icon name="search" size={18} /><input aria-label="Поиск" placeholder="Поиск..." /></div><button className="icon-button" aria-label="Уведомления"><Icon name="bell" size={19} /><span className="notification-dot" /></button><div className="top-avatar">АП</div></div></header>{menuOpen && <nav id="mobile-navigation" className="mobile-navigation" aria-label="Разделы CRM" onKeyDown={event => { if (event.key === 'Escape') closeMenu() }}>
      {[...navItems, ...secondaryItems].map(item => <button key={item.path} aria-current={isActive(item.path) ? 'page' : undefined} className={`nav-item ${isActive(item.path) ? 'active' : ''}`} onClick={() => { closeMenu(); navigate(item.path) }}><Icon name={item.icon} size={20} />{item.label}{item.path === '/tasks' && <span className="nav-badge">{taskCount}</span>}</button>)}
    </nav>}{children}</main>
  </div>
}
