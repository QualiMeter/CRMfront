import { useMemo, useRef, useState, type ChangeEvent } from 'react'
import { Icon } from '../components/Icon'
import type { ItDirection, ProgramInput, University, UniversityInput } from '../types/domain'
import type { WorkBook } from '@e965/xlsx'
import '../import.css'
import '../import-fix.css'

type ImportKind = 'universities' | 'programs'
type RawRow = Record<string, unknown>
type ExcelBook = WorkBook & { __xlsx: typeof import('@e965/xlsx') }

const universityFields = [
  ['name', 'Название вуза', true, ['названиевуза', 'вуз', 'университет', 'university']],
  ['shortName', 'Аббревиатура', true, ['аббревиатура', 'краткоеназвание', 'shortname']],
  ['city', 'Город', true, ['город', 'city']],
  ['contactPerson', 'Ответственный в вузе', true, ['ответственныйввузе', 'контактноелицо', 'фио', 'contact']],
  ['contactRole', 'Должность', true, ['должность', 'роль', 'position']],
  ['status', 'Статус взаимодействия', false, ['статус', 'статуспередачи', 'status']],
] as const

const programFields = [
  ['university', 'Вуз', true, ['названиевуза', 'вуз', 'университет', 'university']],
  ['direction', 'ИТ-направление', true, ['итнаправление', 'направление', 'direction']],
  ['name', 'Название программы', true, ['названиепрограммы', 'программа', 'program']],
  ['product', 'ИТ-продукт / ПО', true, ['итпродукт', 'по', 'программноеобеспечение', 'software', 'product']],
  ['students', 'Обучающиеся', false, ['обучающиеся', 'студенты', 'students']],
  ['streams', 'Потоки', false, ['потоки', 'streams']],
  ['applications', 'Заявки', false, ['заявки', 'applications']],
  ['demand', 'Спрос, %', false, ['спрос', 'востребованность', 'demand']],
] as const

const normalize = (value: unknown) => String(value ?? '').toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]/g, '')
const stringValue = (value: unknown) => String(value ?? '').trim()
const numberValue = (value: unknown) => { const parsed = Number(String(value ?? '0').replace(',', '.').replace(/\s/g, '')); return Number.isFinite(parsed) ? parsed : NaN }
const optionalNumber = (value: unknown) => stringValue(value) ? numberValue(value) : 0

export function ImportPage({ universities, directions, onImportUniversities, onImportPrograms }: {
  universities: University[]
  directions: ItDirection[]
  onImportUniversities: (rows: UniversityInput[]) => Promise<number>
  onImportPrograms: (rows: ProgramInput[]) => Promise<number>
}) {
  const [kind, setKind] = useState<ImportKind>('universities')
  const [fileName, setFileName] = useState('')
  const [headers, setHeaders] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<RawRow[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [sheetNames, setSheetNames] = useState<string[]>([])
  const [sheetName, setSheetName] = useState('')
  const [workbook, setWorkbook] = useState<ExcelBook | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const fields = kind === 'universities' ? universityFields : programFields

  function resetData(nextKind = kind) { setKind(nextKind); setFileName(''); setHeaders([]); setRawRows([]); setMapping({}); setSheetNames([]); setSheetName(''); setWorkbook(null); setMessage(''); setError(''); if (inputRef.current) inputRef.current.value = '' }

  function loadSheet(book: NonNullable<typeof workbook>, selectedSheet: string, nextKind = kind) {
    const sheet = book.Sheets[selectedSheet]
    const XLSX = book.__xlsx
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', raw: false })
    const nextHeaders = (matrix[0] ?? []).map((cell, index) => stringValue(cell) || `Колонка ${index + 1}`)
    const nextRows = matrix.slice(1).filter(row => row.some(cell => stringValue(cell))).map(row => Object.fromEntries(nextHeaders.map((header, index) => [header, row[index] ?? ''])))
    const nextFields = nextKind === 'universities' ? universityFields : programFields
    const autoMapping: Record<string, string> = {}
    nextFields.forEach(([key, , , aliases]) => {
      const match = nextHeaders.find(header => {
        const normalizedHeader = normalize(header)
        return (aliases as readonly string[]).some(alias => normalizedHeader === alias || normalizedHeader.includes(alias) || alias.includes(normalizedHeader))
      })
      if (match) autoMapping[key] = match
    })
    setHeaders(nextHeaders); setRawRows(nextRows); setMapping(autoMapping); setSheetName(selectedSheet); setMessage(''); setError('')
  }

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!/\.(xls|xlsx)$/i.test(file.name)) { setError('Выберите файл XLS или XLSX.'); return }
    if (file.size > 20 * 1024 * 1024) { setError('Размер файла не должен превышать 20 МБ.'); return }
    setBusy(true); setError(''); setMessage('Читаем файл…')
    try {
      const XLSX = await import('@e965/xlsx')
      const book = XLSX.read(await file.arrayBuffer(), { type: 'array' }) as ExcelBook
      book.__xlsx = XLSX
      if (!book.SheetNames.length) throw new Error('В книге нет листов')
      setWorkbook(book); setSheetNames(book.SheetNames); setFileName(file.name); loadSheet(book, book.SheetNames[0])
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось прочитать Excel-файл'); setMessage('') }
    finally { setBusy(false) }
  }

  const parsed = useMemo(() => rawRows.map((row, index) => {
    const value = (key: string) => mapping[key] ? row[mapping[key]] : ''
    const errors: string[] = []
    if (kind === 'universities') {
      const item: UniversityInput = { name: stringValue(value('name')), shortName: stringValue(value('shortName')), city: stringValue(value('city')), contactPerson: stringValue(value('contactPerson')), contactRole: stringValue(value('contactRole')), status: stringValue(value('status')) || 'Контакт найден' }
      universityFields.filter(field => field[2]).forEach(([key, label]) => { if (!stringValue(value(key))) errors.push(`Нет поля «${label}»`) })
      if (universities.some(university => normalize(university.name) === normalize(item.name) || normalize(university.shortName) === normalize(item.shortName))) errors.push('Такой вуз уже существует')
      if (rawRows.findIndex(candidate => normalize(mapping.name ? candidate[mapping.name] : '') === normalize(item.name)) < index) errors.push('Дубликат в загружаемом файле')
      return { index, item, errors }
    }
    const universityText = stringValue(value('university'))
    const university = universities.find(item => normalize(item.name) === normalize(universityText) || normalize(item.shortName) === normalize(universityText))
    const directionText = stringValue(value('direction'))
    const direction = directions.find(item => normalize(item.name) === normalize(directionText) || normalize(item.code) === normalize(directionText))
    const item: ProgramInput = { universityId: university?.id ?? 0, directionId: direction?.id, name: stringValue(value('name')), product: stringValue(value('product')), students: optionalNumber(value('students')), streams: optionalNumber(value('streams')), applications: optionalNumber(value('applications')), demand: optionalNumber(value('demand')) }
    if (!universityText) errors.push('Не указан вуз'); else if (!university) errors.push(`Вуз «${universityText}» не найден`)
    if (!directionText) errors.push('Не указано ИТ-направление'); else if (!direction) errors.push(`ИТ-направление «${directionText}» не найдено в справочнике`)
    if (!item.name) errors.push('Не указано название программы'); if (!item.product) errors.push('Не указан ИТ-продукт')
    for (const [label, number] of [['обучающиеся', item.students], ['потоки', item.streams], ['заявки', item.applications], ['спрос', item.demand]] as const) if (!Number.isFinite(number) || number < 0) errors.push(`Некорректное значение: ${label}`)
    if (item.demand > 100) errors.push('Спрос должен быть от 0 до 100')
    return { index, item, errors }
  }), [rawRows, mapping, kind, universities, directions])
  const validRows = parsed.filter(row => !row.errors.length)
  const invalidRows = parsed.filter(row => row.errors.length)
  const mappingComplete = fields.filter(field => field[2]).every(([key]) => mapping[key])

  async function applyImport() {
    if (!mappingComplete) return setError('Сопоставьте все обязательные поля.')
    if (!validRows.length) return setError('Нет корректных строк для импорта.')
    setBusy(true); setError(''); setMessage('Импортируем данные…')
    try {
      const count = kind === 'universities'
        ? await onImportUniversities(validRows.map(row => row.item as UniversityInput))
        : await onImportPrograms(validRows.map(row => row.item as ProgramInput))
      setMessage(`Импорт завершён: добавлено ${count} из ${rawRows.length} строк.`)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Импорт не выполнен'); setMessage('') }
    finally { setBusy(false) }
  }

  return <div className="content import-workspace">
    <div className="page-heading"><div><div className="eyebrow">МАССОВОЕ ОБНОВЛЕНИЕ</div><h1>Импорт из Excel</h1><p className="muted">Загрузите справочники из XLS/XLSX, сопоставьте поля и проверьте строки</p></div></div>
    <section className="card import-source-card"><div className="import-kind-tabs"><button className={kind === 'universities' ? 'active' : ''} onClick={() => resetData('universities')}>Учебные заведения</button><button className={kind === 'programs' ? 'active' : ''} onClick={() => resetData('programs')}>Направления, программы и ИТ-продукты</button></div><div className="import-dropzone"><span className="import-file-icon"><Icon name="file" size={24} /></span><div><strong>{fileName || 'Выберите таблицу Excel'}</strong><p>XLS или XLSX · первая строка должна содержать заголовки · до 20 МБ</p></div><button className="primary-button" disabled={busy} onClick={() => inputRef.current?.click()}>{fileName ? 'Заменить файл' : 'Выбрать файл'}</button><input ref={inputRef} className="visually-hidden" type="file" accept=".xls,.xlsx" onChange={chooseFile} /></div>{sheetNames.length > 1 && <label className="import-sheet-select">Лист<select value={sheetName} onChange={event => workbook && loadSheet(workbook, event.target.value)}>{sheetNames.map(name => <option key={name}>{name}</option>)}</select></label>}</section>
    {!!headers.length && <><section className="card import-mapping-card"><div className="card-header"><div><h2>Сопоставление столбцов</h2><p>{mappingComplete ? 'Колонки распознаны автоматически. Проверьте соответствие перед импортом.' : 'Не все обязательные колонки распознаны — выберите их вручную.'}</p></div><span className={`import-state ${mappingComplete ? 'ok' : ''}`}>{mappingComplete ? 'Распознано' : 'Нужно заполнить'}</span></div>{kind === 'programs' && <div className="import-order-note"><strong>Сначала заполните справочники</strong><span>Программа привязывается к существующему вузу и отдельному ИТ-направлению; ИТ-продукт остаётся самостоятельным полем.</span></div>}<div className="import-mapping-grid">{fields.map(([key, label, required]) => <label key={key}><span>{label}{required && <b> *</b>}</span><select value={mapping[key] ?? ''} onChange={event => setMapping(current => ({ ...current, [key]: event.target.value }))}><option value="">Не импортировать</option>{headers.map(header => <option key={header}>{header}</option>)}</select></label>)}</div></section>
    <section className="card import-preview-card"><div className="card-header"><div><h2>Проверка данных</h2><p>Корректных: {validRows.length} · с ошибками: {invalidRows.length} · всего: {rawRows.length}</p></div><button className="primary-button" disabled={busy || !mappingComplete || !validRows.length} onClick={() => void applyImport()}>{busy ? 'Обработка…' : `Импортировать ${validRows.length}`}</button></div><div className="import-preview-list">{parsed.slice(0, 50).map(row => <article key={row.index} className={row.errors.length ? 'invalid' : 'valid'}><span>{row.errors.length ? '!' : '✓'}</span><div><strong>Строка {row.index + 2}</strong><p>{kind === 'universities' ? `${(row.item as UniversityInput).name || 'Без названия'} · ${(row.item as UniversityInput).city || 'город не указан'}` : `${directions.find(direction => direction.id === (row.item as ProgramInput).directionId)?.name || 'Без направления'} · ${(row.item as ProgramInput).name || 'Без программы'} · ${(row.item as ProgramInput).product || 'продукт не указан'}`}</p>{row.errors.length > 0 && <small>{row.errors.join(' · ')}</small>}</div></article>)}{parsed.length > 50 && <p className="import-more">Показаны первые 50 строк из {parsed.length}.</p>}</div></section></>}
    {message && <p className="import-feedback success" role="status">{message}</p>}{error && <p className="import-feedback error" role="alert">{error}</p>}
    <p className="demo-note">Импортированные записи сохраняются на backend.</p>
  </div>
}
