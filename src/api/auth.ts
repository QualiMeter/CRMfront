const API_URL = (import.meta.env.VITE_API_URL || 'https://crmbackend-hw.up.railway.app').replace(/\/$/, '')
const SESSION_KEY = 'rtk-crm-auth'

export interface AuthUser {
  id: number
  username: string
  email: string
  full_name: string
  roles: string[]
}

export interface AuthSession {
  accessToken: string
  refreshToken: string
  expiresAt: number
  user: AuthUser
}

interface AuthResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  user: AuthUser
}

export const getSession = (): AuthSession | null => {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null') as AuthSession | null }
  catch { return null }
}

const saveSession = (session: AuthSession | null) => {
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  else localStorage.removeItem(SESSION_KEY)
  window.dispatchEvent(new CustomEvent('crm-auth-change', { detail: session }))
}

export async function syncCurrentUser() {
  const current = getSession()
  if (!current) return null
  const response = await authorizedFetch(`${API_URL}/api/v1/auth/me`)
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.detail || data.message || `Ошибка ${response.status}`)
  const next = { ...current, user: data as AuthUser }
  saveSession(next)
  return next
}

async function authRequest<T>(path: string, body: object): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.detail || data.message || `Ошибка ${response.status}`)
  return data as T
}

const toSession = (response: AuthResponse): AuthSession => ({
  accessToken: response.access_token,
  refreshToken: response.refresh_token,
  expiresAt: Date.now() + response.expires_in * 1000,
  user: response.user,
})

export async function login(username: string, password: string) {
  const session = toSession(await authRequest<AuthResponse>('/api/v1/auth/login', { username, password }))
  saveSession(session)
  return session
}

export async function register(input: { username: string; email: string; password: string; first_name: string; last_name: string }) {
  const session = toSession(await authRequest<AuthResponse>('/api/v1/auth/register', input))
  saveSession(session)
  return session
}

let refreshPromise: Promise<AuthSession> | null = null

async function refreshSession(current: AuthSession) {
  const token = await authRequest<{ access_token: string; refresh_token: string; expires_in: number }>('/api/v1/auth/refresh', { refresh_token: current.refreshToken })
  const next = { ...current, accessToken: token.access_token, refreshToken: token.refresh_token, expiresAt: Date.now() + token.expires_in * 1000 }
  saveSession(next)
  return next
}

function refreshOnce(current: AuthSession) {
  if (!refreshPromise) refreshPromise = refreshSession(current).finally(() => { refreshPromise = null })
  return refreshPromise
}

export async function authorizedFetch(url: string, init: RequestInit = {}, retry = true): Promise<Response> {
  let session = getSession()
  if (!session) throw new Error('Требуется авторизация')
  if (session.expiresAt <= Date.now() + 15_000) {
    try { session = await refreshOnce(session) } catch { saveSession(null); throw new Error('Сессия истекла. Войдите снова.') }
  }
  const response = await fetch(url, { ...init, headers: { ...init.headers, Authorization: `Bearer ${session.accessToken}` } })
  if (response.status === 401 && retry) {
    try { await refreshOnce(session); return authorizedFetch(url, init, false) }
    catch { saveSession(null); throw new Error('Сессия истекла. Войдите снова.') }
  }
  return response
}

export async function logout() {
  const session = getSession()
  saveSession(null)
  if (session) await authRequest('/api/v1/auth/logout', { refresh_token: session.refreshToken }).catch(() => undefined)
}
