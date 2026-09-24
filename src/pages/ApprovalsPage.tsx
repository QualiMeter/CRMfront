import { useMemo, useState } from 'react'
import { Icon } from '../components/Icon'
import { stageStatusLabels } from '../domain/workflow'
import type { WorkflowApprovalRequest } from '../types/domain'
import '../approvals.css'

export function ApprovalsPage({ requests, canReview, currentUserName, onApprove, onReject, onOpenUniversity }: {
  requests: WorkflowApprovalRequest[]
  canReview: boolean
  currentUserName: string
  onApprove: (id: string, comment?: string) => Promise<void>
  onReject: (id: string, comment?: string) => Promise<void>
  onOpenUniversity: (universityId: number, programId?: number) => void
}) {
  const [filter, setFilter] = useState<'pending' | 'all'>('pending')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [comment, setComment] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const visible = useMemo(() => requests
    .filter(item => filter === 'all' || item.status === 'pending')
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt)), [requests, filter])
  const pending = requests.filter(item => item.status === 'pending').length

  async function act(id: string, action: 'approve' | 'reject') {
    if (busyId) return
    setBusyId(id)
    setError('')
    try {
      if (action === 'approve') await onApprove(id, comment[id]?.trim() || undefined)
      else await onReject(id, comment[id]?.trim() || undefined)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось обработать запрос')
    } finally {
      setBusyId(null)
    }
  }

  return <div className="content approvals-page">
    <div className="page-heading">
      <div><div className="eyebrow">КОНТРОЛЬ ИЗМЕНЕНИЙ WORKFLOW</div><h1>Согласования</h1><p className="muted">Изменение статуса этапа пользователем CRM сначала отправляется на подтверждение администратора.</p></div>
      <div className="approval-heading-stat"><strong>{pending}</strong><span>ожидают решения</span></div>
    </div>

    <section className="card approval-info">
      <span className="approval-info-icon"><Icon name="check" size={20}/></span>
      <div><strong>Approval-сценарий подготовлен на фронте</strong><p>Пока backend обновляется, запросы сохраняются локально в браузере. После появления API этот экран переключится на серверные workflow_transition_requests без изменения пользовательского сценария.</p></div>
    </section>

    <div className="approval-toolbar">
      <button className={filter === 'pending' ? 'active' : ''} onClick={() => setFilter('pending')}>Ожидают ({pending})</button>
      <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>Все ({requests.length})</button>
      {!canReview && <span>Решение принимает администратор</span>}
    </div>

    {error && <p className="users-feedback error" role="alert">{error}</p>}
    <div className="approval-list">
      {visible.map(item => <article className="card approval-card" key={item.id}>
        <div className="approval-card-top">
          <div><span className={`approval-state ${item.status}`}>{item.status === 'pending' ? 'Ожидает решения' : item.status === 'approved' ? 'Подтверждено' : 'Отклонено'}</span><h2>{item.stageTitle}</h2><p>{item.universityName} · {item.programName}</p></div>
          <button className="ghost-button" onClick={() => onOpenUniversity(item.universityId, item.programId)}>Открыть карточку <Icon name="arrow" size={15}/></button>
        </div>
        <div className="approval-transition">
          <div><small>Текущий статус</small><strong>{stageStatusLabels[item.fromStatus]}</strong></div>
          <span>→</span>
          <div><small>Запрошенный статус</small><strong>{stageStatusLabels[item.toStatus]}</strong></div>
        </div>
        <dl className="approval-meta">
          <div><dt>Запросил</dt><dd>{item.requestedByName}</dd></div>
          <div><dt>Когда</dt><dd>{new Date(item.requestedAt).toLocaleString('ru-RU')}</dd></div>
          <div><dt>Ответственный этапа</dt><dd>{item.update.owner || 'Не назначен'}</dd></div>
          <div><dt>Дата этапа</dt><dd>{item.update.date || 'Не указана'}</dd></div>
        </dl>
        {item.update.note && <div className="approval-note"><strong>Комментарий КАМа</strong><p>{item.update.note}</p></div>}
        {item.status === 'pending' && canReview && <div className="approval-review">
          <label>Комментарий администратора<textarea rows={2} maxLength={1000} value={comment[item.id] ?? ''} onChange={event => setComment(current => ({ ...current, [item.id]: event.target.value }))} placeholder="Необязательно" /></label>
          <div><button className="danger-button" disabled={busyId === item.id} onClick={() => void act(item.id, 'reject')}>Отклонить</button><button className="primary-button" disabled={busyId === item.id} onClick={() => void act(item.id, 'approve')}>{busyId === item.id ? 'Сохранение…' : 'Подтвердить переход'}</button></div>
        </div>}
        {item.status !== 'pending' && <div className="approval-result"><strong>{item.status === 'approved' ? 'Подтвердил' : 'Отклонил'}: {item.reviewedByName || currentUserName}</strong><span>{item.reviewedAt ? new Date(item.reviewedAt).toLocaleString('ru-RU') : ''}</span>{item.reviewComment && <p>{item.reviewComment}</p>}</div>}
      </article>)}
      {!visible.length && <section className="card empty-state">Запросов по выбранному фильтру нет.</section>}
    </div>
  </div>
}
