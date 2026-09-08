import { useEffect, useState, type ReactNode } from 'react'
import { api } from './api'
import type { UniversityDetails } from './api/client'
import { AppShell } from './components/AppShell'
import { UniversitiesPage } from './pages/UniversitiesPage'
import { UniversityDetailsPage } from './pages/UniversityDetailsPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import type { University } from './types/domain'
import './styles.css'

function App() {
  const [path, setPath] = useState(window.location.pathname)
  const [universities, setUniversities] = useState<University[]>([])
  const [details, setDetails] = useState<UniversityDetails | null>(null)
  const [loading, setLoading] = useState(true)

  const navigate = (nextPath: string) => {
    window.history.pushState({}, '', nextPath)
    setPath(nextPath)
  }

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    if (path === '/universities' || path === '/') {
      api.getUniversities().then((data) => { if (!cancelled) setUniversities(data) }).finally(() => { if (!cancelled) setLoading(false) })
    } else if (path.startsWith('/universities/')) {
      const id = Number(path.split('/')[2])
      api.getUniversity(id).then((data) => { if (!cancelled) setDetails(data) }).finally(() => { if (!cancelled) setLoading(false) })
    } else {
      setLoading(false)
    }
    return () => { cancelled = true }
  }, [path])

  let content: ReactNode
  if (loading) content = <div className="content"><div className="loading card">Загрузка данных…</div></div>
  else if (path === '/universities') content = <UniversitiesPage universities={universities} onOpen={(id) => navigate(`/universities/${id}`)} />
  else if (path.startsWith('/universities/')) content = details ? <UniversityDetailsPage data={details} /> : <div className="content"><div className="loading card">Вуз не найден.</div></div>
  else if (path === '/') content = <UniversitiesPage universities={universities} onOpen={(id) => navigate(`/universities/${id}`)} />
  else content = <PlaceholderPage title={routeTitle(path)} description="Этот раздел уже подключён к общей навигации и API-слою. Его содержимое добавим следующим этапом." />

  return <AppShell path={path} navigate={navigate}>{content}</AppShell>
}

function routeTitle(path: string) { const map: Record<string, string> = { '/programs': 'Образовательные программы', '/analytics': 'Аналитика', '/tasks': 'Задачи', '/documents': 'Документы' }; return map[path] ?? 'Раздел' }
export default App
