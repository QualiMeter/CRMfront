import { useState, type FormEvent } from 'react'
import type { Program, University } from '../types/domain'
import '../interaction-card.css'

type TransferStatus = 'not_started' | 'preparing' | 'transferred' | 'accepted'

interface InteractionMeta {
  vendor: string
  contractNumber: string
  licenseSignedAt: string
  licenseValidUntil: string
  transferStatus: TransferStatus
  managerName: string
  universityContact: string
  comment: string
}

const STORAGE_KEY = 'rtk-crm-interaction-meta'
const statusLabels: Record<TransferStatus, string> = {
  not_started: 'Не начата',
  preparing: 'Подготовка',
  transferred: 'Передано',
  accepted: 'Принято вузом',
}

function loadMeta(university: University, program: Program, currentUserName: string): InteractionMeta {
  const fallback: InteractionMeta = {
    vendor: '',
    contractNumber: '',
    licenseSignedAt: '',
    licenseValidUntil: '',
    transferStatus: 'not_started',
    managerName: currentUserName,
    universityContact: university.contactPerson || '',
    comment: '',
  }
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as Record<string, Partial<InteractionMeta>>
    return { ...fallback, ...(all[`${university.id}:${program.id}`] ?? {}) }
  } catch {
    return fallback
  }
}

function saveMeta(universityId: number, programId: number, value: InteractionMeta) {
  let all: Record<string, InteractionMeta> = {}
  try { all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as Record<string, InteractionMeta> } catch { /* use empty */ }
  all[`${universityId}:${programId}`] = value
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
}

export function InteractionCard({ university, program, currentUserName }: { university: University; program: Program; currentUserName: string }) {
  const [editing, setEditing] = useState(false)
  const [meta, setMeta] = useState<InteractionMeta>(() => loadMeta(university, program, currentUserName))
  const [draft, setDraft] = useState(meta)
  const [message, setMessage] = useState('')

  function set<K extends keyof InteractionMeta>(key: K, value: InteractionMeta[K]) {
    setDraft(current => ({ ...current, [key]: value }))
    setMessage('')
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    saveMeta(university.id, program.id, draft)
    setMeta(draft)
    setEditing(false)
    setMessage('Данные взаимодействия сохранены в демо-контуре')
  }

  return <section className="card interaction-card">
    <div className="card-header">
      <div><div className="eyebrow">КАРТОЧКА ВЗАИМОДЕЙСТВИЯ</div><h2>Договор, лицензия и передача ПО</h2><p>{program.direction || 'ИТ-направление не указано'} · {program.name}</p></div>
      <button className="outline-button" onClick={() => { setDraft(meta); setEditing(value => !value); setMessage('') }}>{editing ? 'Отмена' : 'Редактировать'}</button>
    </div>

    {!editing ? <div className="interaction-meta-grid">
      <div><span>ИТ-продукт / ПО</span><strong>{program.product || 'Не указано'}</strong></div>
      <div><span>Вендор</span><strong>{meta.vendor || 'Не указан'}</strong></div>
      <div><span>Номер договора</span><strong>{meta.contractNumber || 'Не указан'}</strong></div>
      <div><span>Подписание лицензии</span><strong>{meta.licenseSignedAt || 'Не указано'}</strong></div>
      <div><span>Срок лицензии</span><strong>{meta.licenseValidUntil || 'Не указан'}</strong></div>
      <div><span>Статус передачи</span><strong><i className={`transfer-dot ${meta.transferStatus}`} />{statusLabels[meta.transferStatus]}</strong></div>
      <div><span>КАМ / менеджер</span><strong>{meta.managerName || 'Не назначен'}</strong></div>
      <div><span>Ответственный от вуза</span><strong>{meta.universityContact || 'Не указан'}</strong></div>
      <div className="wide"><span>Комментарий</span><strong>{meta.comment || 'Комментарий не добавлен'}</strong></div>
    </div> : <form className="interaction-meta-form" onSubmit={submit}>
      <div className="interaction-form-grid">
        <label>ИТ-продукт / ПО<input value={program.product} disabled /></label>
        <label>Вендор<input maxLength={160} value={draft.vendor} onChange={event => set('vendor', event.target.value)} placeholder="Название вендора" /></label>
        <label>Номер договора<input maxLength={120} value={draft.contractNumber} onChange={event => set('contractNumber', event.target.value)} placeholder="Например, 24-IT-015" /></label>
        <label>Подписание лицензии<input type="date" value={draft.licenseSignedAt} onChange={event => set('licenseSignedAt', event.target.value)} /></label>
        <label>Срок действия лицензии<input type="date" min={draft.licenseSignedAt || undefined} value={draft.licenseValidUntil} onChange={event => set('licenseValidUntil', event.target.value)} /></label>
        <label>Статус передачи<select value={draft.transferStatus} onChange={event => set('transferStatus', event.target.value as TransferStatus)}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>КАМ / менеджер<input maxLength={160} value={draft.managerName} onChange={event => set('managerName', event.target.value)} /></label>
        <label>Ответственный от вуза<input maxLength={160} value={draft.universityContact} onChange={event => set('universityContact', event.target.value)} /></label>
        <label className="wide">Комментарий<textarea rows={3} maxLength={2000} value={draft.comment} onChange={event => set('comment', event.target.value)} placeholder="Договорённости, риски, следующий шаг" /></label>
      </div>
      <div className="modal-actions"><button type="button" className="task-action" onClick={() => { setDraft(meta); setEditing(false) }}>Отмена</button><button className="primary-button" type="submit">Сохранить</button></div>
    </form>}
    {message && <p className="save-message" role="status">{message}</p>}
    <p className="demo-note">Поля подготовлены по ТЗ. Пока backend добавляет соответствующие колонки/endpoint, значения хранятся только локально в браузере.</p>
  </section>
}
