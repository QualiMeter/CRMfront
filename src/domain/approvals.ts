import type { WorkflowApprovalRequest } from '../types/domain'

const KEY = 'rtk-crm-workflow-approvals'

export function loadWorkflowApprovals(): WorkflowApprovalRequest[] {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(value) ? value as WorkflowApprovalRequest[] : []
  } catch {
    return []
  }
}

export function saveWorkflowApprovals(items: WorkflowApprovalRequest[]) {
  localStorage.setItem(KEY, JSON.stringify(items))
}

export function createApprovalId() {
  return `approval-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}
