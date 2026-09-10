import { useMemo, useState, type ChangeEvent, type FormEvent, type MouseEvent } from 'react'
import { Icon } from '../components/Icon'
import type {
  CrmDocument,
  DocumentCategory,
  DocumentInput,
  DocumentStatus,
  DocumentUpdate,
  Program,
  University,
} from '../types/domain'
import '../documents.css'

const statusLabels: Record<DocumentStatus, string> = {
  draft: 'Черновик',
  review: 'На согласовании',
  approved: 'Готов',
  rejected: 'Требует правок',
}

const categoryLabels: Record<DocumentCategory, string> = {
  agreement: 'Договор',
  program: 'Учебная программа',
  license: 'Лицензия',
  methodology: 'Методические материалы',
  protocol: 'Протокол',
  other: 'Другое',
}

const formatDate = (value: string) => new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value))

function formatFileSize(file: File) {
  if (file.size < 1024 * 1024) return `${Math.max(1, Math.round(file.size / 1024))} КБ`
  return `${(file.size / 1024 / 1024).toFixed(1).replace('.', ',')} МБ`
}

export function DocumentsPage({ documents, programs, universities, onCreate, onUpdate, onDelete, onOpenUniversity }: {
  documents: CrmDocument[]
  programs: Program[]
  universities: University[]
  onCreate: (input: DocumentInput) => Promise<void>
  onUpdate: (id: number, update: DocumentUpdate) => Promise<void>
  onDelete: (id: number) => Promise<void>
  onOpenUniversity: (id: number, programId?: number) => void
}) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<DocumentStatus | ''>('')
  const [category, setCategory] = useState<DocumentCategory | ''>('')
  const [universityId, setUniversityId] = useState<number | ''>('')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [selected, setSelected] = useState<CrmDocument | null>(null)

  const filtered = useMemo(() => documents.filter(document => {
    const university = universities.find(item => item.id === document.universityId)
    const program = programs.find(item => item.id === document.programId)
    const haystack = `${document.name} ${document.owner} ${university?.name ?? ''} ${university?.shortName ?? ''} ${program?.name ?? ''}`.toLowerCase()
    return (!query || haystack.includes(query.toLowerCase()))
      && (!status || document.status === status)
      && (!category || document.category === category)
      && (!universityId || document.universityId === universityId)
  }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [documents, programs, universities, query, status, category, universityId])

  const counters = useMemo(() => ({
    all: documents.length,
    review: documents.filter(document => document.status === 'review').length,
    approved: documents.filter(document => document.status === 'approved').length,
    attention: documents.filter(document => document.status === 'rejected').length,
  }), [documents])

  return <div className="content documents-page">
    <div className="page-heading">
      <div><div className="eyebrow">ДОКУМЕНТООБОРОТ</div><h1>Документы</h1><p className="muted">Файлы по вузам, программам, договорам и внедрению ИТ-продуктов</p></div>
      <button className="primary-button" onClick={() => setUploadOpen(true)}><Icon name="plus" size={18} /> Загрузить документ</button>
    </div>

    <section className="document-kpi-grid">
      <DocumentKpi label="Всего документов" value={counters.all} hint={`${universities.length} учебных заведений`} />
      <DocumentKpi label="На согласовании" value={counters.review} hint="Ожидают решения" tone="review" />
      <DocumentKpi label="Готово" value={counters.approved} hint="Актуальные версии" tone="approved" />
      <DocumentKpi label="Требуют правок" value={counters.attention} hint="Нужна реакция" tone="attention" />
    </section>

    <section className="card document-workspace">
      <div className="document-toolbar">
        <div className="document-search"><Icon name="search" size={17}/><input value={query} onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)} placeholder="Название, вуз, программа, ответственный" aria-label="Поиск документов" /></div>
        <select value={status} onChange={(event: ChangeEvent<HTMLSelectElement>) => setStatus(event.target.value as DocumentStatus | '')} aria-label="Фильтр по статусу"><option value="">Все статусы</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <select value={category} onChange={(event: ChangeEvent<HTMLSelectElement>) => setCategory(event.target.value as DocumentCategory | '')} aria-label="Фильтр по категории"><option value="">Все категории</option>{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <select value={universityId} onChange={(event: ChangeEvent<HTMLSelectElement>) => setUniversityId(event.target.value ? Number(event.target.value) : '')} aria-label="Фильтр по вузу"><option value="">Все вузы</option>{universities.map(university => <option key={university.id} value={university.id}>{university.shortName}</option>)}</select>
      </div>

      <div className="document-list-heading"><div><h2>Реестр документов</h2><p>{filtered.length} из {documents.length} документов</p></div>{(query || status || category || universityId) && <button className="ghost-button" onClick={() => { setQuery(''); setStatus(''); setCategory(''); setUniversityId('') }}>Сбросить фильтры</button>}</div>

      <div className="document-table-wrap">
        <table className="document-table"><thead><tr><th>Документ</th><th>Вуз / программа</th><th>Категория</th><th>Ответственный</th><th>Версия</th><th>Обновлён</th><th>Статус</th></tr></thead><tbody>
          {filtered.map(document => {
            const university = universities.find(item => item.id === document.universityId)
            const program = programs.find(item => item.id === document.programId)
            return <tr key={document.id} onClick={() => setSelected(document)}>
              <td><div className="document-name-cell"><span className="doc-icon"><Icon name="file" size={18}/></span><span><strong>{document.name}</strong><small>{document.size}</small></span></div></td>
              <td><strong>{university?.shortName ?? '—'}</strong><span className="table-secondary">{program?.name ?? 'Без привязки к программе'}</span></td>
              <td>{categoryLabels[document.category]}</td><td>{document.owner}</td><td>v{document.version}</td><td>{formatDate(document.updatedAt)}</td>
              <td><DocumentStatusBadge status={document.status} /></td>
            </tr>
          })}
        </tbody></table>
      </div>

      <div className="document-mobile-list">{filtered.map(document => {
        const university = universities.find(item => item.id === document.universityId)
        const program = programs.find(item => item.id === document.programId)
        return <button className="document-mobile-card" key={document.id} onClick={() => setSelected(document)}>
          <div className="document-mobile-title"><span className="doc-icon"><Icon name="file" size={18}/></span><span><strong>{document.name}</strong><small>{document.size} · v{document.version}</small></span></div>
          <DocumentStatusBadge status={document.status} />
          <dl><div><dt>Вуз</dt><dd>{university?.shortName ?? '—'}</dd></div><div><dt>Программа</dt><dd>{program?.name ?? 'Без привязки'}</dd></div><div><dt>Категория</dt><dd>{categoryLabels[document.category]}</dd></div><div><dt>Обновлён</dt><dd>{formatDate(document.updatedAt)}</dd></div></dl>
        </button>
      })}</div>
      {!filtered.length && <div className="empty-state">Документы по выбранным условиям не найдены.</div>}
    </section>

    {uploadOpen && <DocumentUploadModal universities={universities} programs={programs} onClose={() => setUploadOpen(false)} onSave={async input => { await onCreate(input); setUploadOpen(false) }} />}
    {selected && <DocumentDetailsModal key={`${selected.id}-${selected.updatedAt}`} document={documents.find(item => item.id === selected.id) ?? selected} programs={programs} universities={universities} onClose={() => setSelected(null)} onOpenUniversity={onOpenUniversity} onSave={async update => { await onUpdate(selected.id, update); setSelected(null) }} onDelete={async () => { await onDelete(selected.id); setSelected(null) }} />}
  </div>
}

function DocumentKpi({ label, value, hint, tone = 'neutral' }: { label: string; value: number; hint: string; tone?: 'neutral' | 'review' | 'approved' | 'attention' }) {
  return <div className={`card document-kpi ${tone}`}><span>{label}</span><strong>{value}</strong><small>{hint}</small></div>
}

function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  return <span className={`document-status-badge ${status}`}><i />{statusLabels[status]}</span>
}

function DocumentUploadModal({ universities, programs, onClose, onSave }: { universities: University[]; programs: Program[]; onClose: () => void; onSave: (input: DocumentInput) => Promise<void> }) {
  const [file, setFile] = useState<File | null>(null)
  const [draft, setDraft] = useState<Omit<DocumentInput, 'name' | 'size' | 'mimeType'>>({ universityId: universities[0]?.id ?? 0, programId: undefined, category: 'agreement', owner: 'Петров А.А.', status: 'review', note: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const availablePrograms = programs.filter(program => program.universityId === draft.universityId)

  function chooseFile(event: ChangeEvent<HTMLInputElement>) { setFile(event.target.files?.[0] ?? null); setError('') }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (saving) return
    if (!file) { setError('Выберите файл'); return }
    setSaving(true); setError('')
    try { await onSave({ ...draft, name: file.name, size: formatFileSize(file), mimeType: file.type || 'application/octet-stream' }) }
    catch (error) { setError(error instanceof Error ? error.message : 'Не удалось загрузить документ') }
    finally { setSaving(false) }
  }

  return <div className="crm-overlay" onMouseDown={(event: MouseEvent<HTMLDivElement>) => { if (event.target === event.currentTarget && !saving) onClose() }}><section className="crm-modal document-editor-modal" role="dialog" aria-modal="true" aria-labelledby="document-upload-title">
    <div className="modal-heading"><div><div className="eyebrow">НОВЫЙ ДОКУМЕНТ</div><h2 id="document-upload-title">Загрузить документ</h2></div><button className="modal-close" disabled={saving} onClick={onClose}>×</button></div>
    <form className="modal-form document-form" onSubmit={submit}><fieldset disabled={saving}>
      <label className="document-file-picker"><span>Файл</span><input required type="file" onChange={chooseFile}/><small>{file ? `${file.name} · ${formatFileSize(file)}` : 'PDF, DOCX, XLSX, ZIP и другие форматы'}</small></label>
      <div className="modal-form-grid"><label>Учебное заведение<select value={draft.universityId} onChange={(event: ChangeEvent<HTMLSelectElement>) => setDraft(current => ({ ...current, universityId: Number(event.target.value), programId: undefined }))}>{universities.map(university => <option key={university.id} value={university.id}>{university.shortName} · {university.city}</option>)}</select></label><label>Программа<select value={draft.programId ?? ''} onChange={(event: ChangeEvent<HTMLSelectElement>) => setDraft(current => ({ ...current, programId: event.target.value ? Number(event.target.value) : undefined }))}><option value="">Без привязки</option>{availablePrograms.map(program => <option key={program.id} value={program.id}>{program.name}</option>)}</select></label></div>
      <div className="modal-form-grid"><label>Категория<select value={draft.category} onChange={(event: ChangeEvent<HTMLSelectElement>) => setDraft(current => ({ ...current, category: event.target.value as DocumentCategory }))}>{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Статус после загрузки<select value={draft.status} onChange={(event: ChangeEvent<HTMLSelectElement>) => setDraft(current => ({ ...current, status: event.target.value as DocumentStatus }))}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
      <label>Ответственный<input required maxLength={120} value={draft.owner} onChange={(event: ChangeEvent<HTMLInputElement>) => setDraft(current => ({ ...current, owner: event.target.value }))}/></label>
      <label>Комментарий<textarea rows={3} maxLength={2000} value={draft.note} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setDraft(current => ({ ...current, note: event.target.value }))} placeholder="Например: что нужно проверить или согласовать" /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <p className="demo-note">В демо сохраняются метаданные файла. Реальный файл будет уходить в backend-хранилище.</p>
      <div className="modal-actions"><button type="button" className="task-action" onClick={onClose}>Отмена</button><button className="primary-button" type="submit">{saving ? 'Загрузка…' : 'Загрузить'}</button></div>
    </fieldset></form>
  </section></div>
}

function DocumentDetailsModal({ document, programs, universities, onClose, onSave, onDelete, onOpenUniversity }: { document: CrmDocument; programs: Program[]; universities: University[]; onClose: () => void; onSave: (update: DocumentUpdate) => Promise<void>; onDelete: () => Promise<void>; onOpenUniversity: (id: number, programId?: number) => void }) {
  const [draft, setDraft] = useState<DocumentUpdate>({ status: document.status, category: document.category, programId: document.programId, owner: document.owner, note: document.note, version: document.version })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const university = universities.find(item => item.id === document.universityId)
  const linkedProgram = programs.find(item => item.id === document.programId)
  const availablePrograms = programs.filter(program => program.universityId === document.universityId)

  async function save() {
    if (saving) return; setSaving(true); setError('')
    try { await onSave(draft) } catch (error) { setError(error instanceof Error ? error.message : 'Не удалось сохранить изменения'); setSaving(false) }
  }
  async function createVersion() {
    if (saving) return; setSaving(true); setError('')
    try { await onSave({ ...draft, version: document.version + 1, status: 'review' }) } catch (error) { setError(error instanceof Error ? error.message : 'Не удалось создать новую версию'); setSaving(false) }
  }
  async function remove() {
    if (!window.confirm(`Удалить документ «${document.name}»?`)) return
    setSaving(true); setError('')
    try { await onDelete() } catch (error) { setError(error instanceof Error ? error.message : 'Не удалось удалить документ'); setSaving(false) }
  }

  return <div className="crm-overlay" onMouseDown={(event: MouseEvent<HTMLDivElement>) => { if (event.target === event.currentTarget && !saving) onClose() }}><section className="crm-modal document-details-modal" role="dialog" aria-modal="true" aria-labelledby="document-details-title">
    <div className="modal-heading"><div><div className="eyebrow">КАРТОЧКА ДОКУМЕНТА</div><h2 id="document-details-title">{document.name}</h2></div><button className="modal-close" disabled={saving} onClick={onClose}>×</button></div>
    <div className="document-detail-hero"><span className="document-detail-icon"><Icon name="file" size={24}/></span><div><DocumentStatusBadge status={document.status}/><p>{categoryLabels[document.category]} · {document.size} · версия {document.version}</p></div></div>
    <dl className="document-details-grid"><div><dt>Учебное заведение</dt><dd>{university?.name ?? '—'}</dd></div><div><dt>Программа</dt><dd>{linkedProgram?.name ?? 'Без привязки'}</dd></div><div><dt>Загружен</dt><dd>{formatDate(document.uploadedAt)}</dd></div><div><dt>Обновлён</dt><dd>{formatDate(document.updatedAt)}</dd></div></dl>
    <div className="document-edit-fields"><div className="modal-form-grid"><label>Статус<select disabled={saving} value={draft.status} onChange={(event: ChangeEvent<HTMLSelectElement>) => setDraft(current => ({ ...current, status: event.target.value as DocumentStatus }))}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Категория<select disabled={saving} value={draft.category} onChange={(event: ChangeEvent<HTMLSelectElement>) => setDraft(current => ({ ...current, category: event.target.value as DocumentCategory }))}>{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
      <label>Программа<select disabled={saving} value={draft.programId ?? ''} onChange={(event: ChangeEvent<HTMLSelectElement>) => setDraft(current => ({ ...current, programId: event.target.value ? Number(event.target.value) : undefined }))}><option value="">Без привязки</option>{availablePrograms.map(program => <option key={program.id} value={program.id}>{program.name}</option>)}</select></label>
      <label>Ответственный<input disabled={saving} maxLength={120} value={draft.owner ?? ''} onChange={(event: ChangeEvent<HTMLInputElement>) => setDraft(current => ({ ...current, owner: event.target.value }))}/></label>
      <label>Комментарий<textarea disabled={saving} rows={3} maxLength={2000} value={draft.note ?? ''} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setDraft(current => ({ ...current, note: event.target.value }))}/></label>
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
    <div className="document-modal-footer"><button className="danger-button" disabled={saving} onClick={() => void remove()}>Удалить</button><div><button className="task-action" disabled={saving} onClick={() => { onClose(); onOpenUniversity(document.universityId, document.programId) }}>Открыть вуз</button><button className="task-action" disabled={saving} onClick={() => void createVersion()}>Новая версия</button><button className="primary-button" disabled={saving} onClick={() => void save()}>{saving ? 'Сохранение…' : 'Сохранить'}</button></div></div>
  </section></div>
}
