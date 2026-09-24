import { useMemo, useRef, useState, type ChangeEvent } from 'react'
import type { WorkBook } from '@e965/xlsx'
import { Icon } from '../components/Icon'
import type { Program, University } from '../types/domain'
import '../student-registry.css'

interface StudentRecord {
  id: string
  fullName: string
  email: string
  universityId: number
  programId?: number
  importedAt: string
}

type PreviewRow = {
  row: number
  fullName: string
  email: string
  errors: string[]
}

const STORAGE_KEY = 'rtk-crm-student-registry'
const normalize = (value: unknown) => String(value ?? '').trim()
const headerKey = (value: unknown) => normalize(value).toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]/g, '')

function loadRecords(): StudentRecord[] {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(value) ? value as StudentRecord[] : []
  } catch {
    return []
  }
}

function saveRecords(records: StudentRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function StudentRegistryPage({ universities, programs }: { universities: University[]; programs: Program[] }) {
  const [records, setRecords] = useState<StudentRecord[]>(() => loadRecords())
  const [query, setQuery] = useState('')
  const [filterUniversity, setFilterUniversity] = useState<number | ''>('')
  const [filterProgram, setFilterProgram] = useState<number | ''>('')
  const [targetUniversity, setTargetUniversity] = useState<number>(universities[0]?.id ?? 0)
  const [targetProgram, setTargetProgram] = useState<number | ''>('')
  const [preview, setPreview] = useState<PreviewRow[]>([])
  const [fileName, setFileName] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const targetPrograms = programs.filter(program => program.universityId === targetUniversity)
  const filterPrograms = programs.filter(program => !filterUniversity || program.universityId === filterUniversity)

  const filtered = useMemo(() => records.filter(record => {
    const haystack = `${record.fullName} ${record.email}`.toLowerCase()
    return (!query || haystack.includes(query.toLowerCase()))
      && (!filterUniversity || record.universityId === filterUniversity)
      && (!filterProgram || record.programId === filterProgram)
  }).sort((a, b) => a.fullName.localeCompare(b.fullName, 'ru')), [records, query, filterUniversity, filterProgram])

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!/\.(csv|xls|xlsx)$/i.test(file.name)) { setError('Поддерживаются CSV, XLS и XLSX.'); return }
    if (file.size > 20 * 1024 * 1024) { setError('Размер файла не должен превышать 20 МБ.'); return }
    setBusy(true); setError(''); setMessage('')
    try {
      const XLSX = await import('@e965/xlsx')
      const book = XLSX.read(await file.arrayBuffer(), { type: 'array' }) as WorkBook
      if (!book.SheetNames.length) throw new Error('В файле нет таблицы')
      const sheet = book.Sheets[book.SheetNames[0]]
      const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', raw: false })
      const headers = (matrix[0] ?? []).map(headerKey)
      const nameIndex = headers.findIndex(header => ['фио','фамилияимяотчество','fullname','name','студент'].includes(header))
      const emailIndex = headers.findIndex(header => ['email','почта','электроннаяпочта','mail'].includes(header))
      if (nameIndex < 0 || emailIndex < 0) throw new Error('Не найдены обязательные колонки «ФИО» и «Email»')
      const seen = new Set<string>()
      const rows: PreviewRow[] = matrix.slice(1).map((row, index) => {
        const fullName = normalize(row[nameIndex])
        const email = normalize(row[emailIndex]).toLowerCase()
        const errors: string[] = []
        if (!fullName) errors.push('Не указано ФИО')
        if (!email) errors.push('Не указан email')
        else if (!validEmail(email)) errors.push('Некорректный email')
        if (email && seen.has(email)) errors.push('Дубликат email в файле')
        if (email && records.some(item => item.email.toLowerCase() === email)) errors.push('Студент с таким email уже есть')
        if (email) seen.add(email)
        return { row: index + 2, fullName, email, errors }
      }).filter(row => row.fullName || row.email)
      setPreview(rows)
      setFileName(file.name)
      if (!rows.length) throw new Error('В файле нет строк с данными')
    } catch (reason) {
      setPreview([])
      setFileName('')
      setError(reason instanceof Error ? reason.message : 'Не удалось прочитать файл')
    } finally {
      setBusy(false)
      event.target.value = ''
    }
  }

  function applyImport() {
    if (!targetUniversity) return setError('Выберите учебное заведение')
    const valid = preview.filter(row => !row.errors.length)
    if (!valid.length) return setError('Нет корректных строк для импорта')
    const now = new Date().toISOString()
    const created = valid.map((row, index): StudentRecord => ({
      id: `student-${Date.now()}-${index}`,
      fullName: row.fullName,
      email: row.email,
      universityId: targetUniversity,
      programId: targetProgram || undefined,
      importedAt: now,
    }))
    const next = [...records, ...created]
    setRecords(next)
    saveRecords(next)
    setMessage(`Импортировано: ${created.length}. Строк с ошибками пропущено: ${preview.length - created.length}.`)
    setPreview([])
    setFileName('')
    setError('')
  }

  function removeRecord(id: string) {
    if (!window.confirm('Удалить студента из локального реестра?')) return
    const next = records.filter(item => item.id !== id)
    setRecords(next)
    saveRecords(next)
  }

  return <div className="content student-registry-page">
    <div className="page-heading">
      <div><div className="eyebrow">ПОИМЁННЫЙ УЧЁТ</div><h1>Студенты</h1><p className="muted">ФИО и email обучающихся с массовой загрузкой CSV/XLS/XLSX.</p></div>
      <button className="primary-button" onClick={() => inputRef.current?.click()}><Icon name="plus" size={17}/> Загрузить список</button>
      <input ref={inputRef} className="visually-hidden" type="file" accept=".csv,.xls,.xlsx" onChange={chooseFile}/>
    </div>

    <section className="student-registry-kpis">
      <article className="card"><span>Всего студентов</span><strong>{records.length}</strong></article>
      <article className="card"><span>Вузов в реестре</span><strong>{new Set(records.map(item => item.universityId)).size}</strong></article>
      <article className="card"><span>С программой</span><strong>{records.filter(item => item.programId).length}</strong></article>
      <article className="card"><span>Требуемые поля</span><strong>ФИО + email</strong></article>
    </section>

    {(preview.length > 0 || fileName) && <section className="card student-import-card">
      <div className="card-header"><div><h2>Предпросмотр импорта</h2><p>{fileName} · корректных {preview.filter(row => !row.errors.length).length} из {preview.length}</p></div></div>
      <div className="student-import-target">
        <label>Учебное заведение<select value={targetUniversity} onChange={event => { setTargetUniversity(Number(event.target.value)); setTargetProgram('') }}>{universities.map(item => <option key={item.id} value={item.id}>{item.shortName} · {item.city}</option>)}</select></label>
        <label>Программа<select value={targetProgram} onChange={event => setTargetProgram(event.target.value ? Number(event.target.value) : '')}><option value="">Без привязки к программе</option>{targetPrograms.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      </div>
      <div className="student-preview-list">{preview.slice(0, 30).map(row => <article className={row.errors.length ? 'invalid' : 'valid'} key={row.row}><span>{row.errors.length ? '!' : '✓'}</span><div><strong>{row.fullName || 'ФИО не указано'}</strong><p>{row.email || 'Email не указан'}</p>{row.errors.length > 0 && <small>{row.errors.join(' · ')}</small>}</div></article>)}</div>
      <div className="modal-actions"><button className="task-action" onClick={() => { setPreview([]); setFileName('') }}>Отмена</button><button className="primary-button" disabled={busy || !preview.some(row => !row.errors.length)} onClick={applyImport}>Импортировать корректные строки</button></div>
    </section>}

    {message && <p className="import-feedback success" role="status">{message}</p>}
    {error && <p className="import-feedback error" role="alert">{error}</p>}

    <section className="card student-registry-card">
      <div className="student-registry-toolbar">
        <label className="list-search"><Icon name="search" size={17}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Поиск по ФИО или email"/></label>
        <select value={filterUniversity} onChange={event => { setFilterUniversity(event.target.value ? Number(event.target.value) : ''); setFilterProgram('') }}><option value="">Все вузы</option>{universities.map(item => <option key={item.id} value={item.id}>{item.shortName}</option>)}</select>
        <select value={filterProgram} onChange={event => setFilterProgram(event.target.value ? Number(event.target.value) : '')}><option value="">Все программы</option>{filterPrograms.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
      </div>
      <div className="student-registry-table">
        <div className="student-registry-head"><span>Студент</span><span>Вуз</span><span>Программа</span><span>Импортирован</span><span/></div>
        {filtered.map(record => <article key={record.id}><div><strong>{record.fullName}</strong><small>{record.email}</small></div><span>{universities.find(item => item.id === record.universityId)?.shortName || `#${record.universityId}`}</span><span>{programs.find(item => item.id === record.programId)?.name || 'Без программы'}</span><span>{new Date(record.importedAt).toLocaleDateString('ru-RU')}</span><button onClick={() => removeRecord(record.id)}>Удалить</button></article>)}
        {!filtered.length && <p className="empty-state">В локальном реестре пока нет студентов по выбранным условиям.</p>}
      </div>
    </section>
    <p className="demo-note">Сейчас реестр хранится локально в браузере. После появления POST /students/import фронт переключится на серверное хранение без изменения сценария.</p>
  </div>
}
