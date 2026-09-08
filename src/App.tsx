import { useEffect, useState, type ReactNode } from 'react'
import { api } from './api'
import type { UniversityDetails } from './api/client'
import { AppShell } from './components/AppShell'
import { UniversitiesPage } from './pages/UniversitiesPage'
import { UniversityDetailsPage } from './pages/UniversityDetailsPage'
import { SectionPage } from './pages/SectionPage'
import type { University } from './types/domain'
import './styles.css'

function App() {
  const [path, setPath] = useState(window.location.pathname)
  const [universities, setUniversities] = useState<University[]>([])
  const [details, setDetails] = useState<UniversityDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [allPrograms, setAllPrograms] = useState<UniversityDetails['programs']>([])
  const [allActivities, setAllActivities] = useState<UniversityDetails['activities']>([])

  const navigate = (nextPath: string) => {
    window.history.pushState({}, '', nextPath)
    setPath(nextPath)
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    if (path === '/' || path === '/universities') {
      api.getUniversities().then((data) => { if (!cancelled) setUniversities(data) }).finally(() => { if (!cancelled) setLoading(false) })
    } else if (path.startsWith('/universities/')) {
      const id = Number(path.split('/')[2])
      api.getUniversity(id).then((data) => { if (!cancelled) { setDetails(data); setAllPrograms(data.programs); setAllActivities(data.activities) } }).finally(() => { if (!cancelled) setLoading(false) })
    } else {
      Promise.all([api.getUniversities(), ...[1,2,3].map(id => api.getUniversity(id))]).then(([us, ...detailsList]) => {
        if (!cancelled) { setUniversities(us); setAllPrograms(detailsList.flatMap(d => d.programs)); setAllActivities(detailsList.flatMap(d => d.activities)) }
      }).finally(() => { if (!cancelled) setLoading(false) })
    }
    return () => { cancelled = true }
  }, [path])

  let content: ReactNode
  if (loading) content = <div className="content"><div className="loading card">Загрузка данных…</div></div>
  else if (path === '/universities') content = <UniversitiesPage universities={universities} onOpen={(id) => navigate(`/universities/${id}`)} />
  else if (path.startsWith('/universities/')) content = details ? <UniversityDetailsPage data={details} universities={universities} onSwitch={(id) => navigate(`/universities/${id}`)} /> : <div className="content"><div className="loading card">Вуз не найден.</div></div>
  else if (path === '/') content = <UniversitiesPage universities={universities} onOpen={(id) => navigate(`/universities/${id}`)} />
  else if (['/programs','/analytics','/tasks','/documents'].includes(path)) content = <SectionPage section={path.slice(1) as 'programs' | 'analytics' | 'tasks' | 'documents'} programs={allPrograms} activities={allActivities} onOpenUniversity={(id) => navigate(`/universities/${id}`)} />
  else content = <div className="content"><div className="loading card">Раздел не найден.</div></div>

  return <AppShell path={path} navigate={navigate}>{content}</AppShell>
}

export default App
