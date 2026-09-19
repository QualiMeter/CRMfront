export interface CrmProfile {
  name: string
  role: string
  department: string
  email: string
  phone: string
  taskNotifications: boolean
  overdueNotifications: boolean
}

export const DEFAULT_PROFILE: CrmProfile = {
  name: '',
  role: '',
  department: '',
  email: '',
  phone: '',
  taskNotifications: true,
  overdueNotifications: true,
}

const PROFILE_KEY = 'crm-profile'
export const PROFILE_EVENT = 'crm-profile-updated'

export function getProfile(): CrmProfile {
  try {
    const value = localStorage.getItem(PROFILE_KEY)
    if (!value) return DEFAULT_PROFILE
    return { ...DEFAULT_PROFILE, ...JSON.parse(value) }
  } catch {
    return DEFAULT_PROFILE
  }
}

export function saveProfile(profile: CrmProfile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
  window.dispatchEvent(new CustomEvent(PROFILE_EVENT, { detail: profile }))
}

export function profileInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : parts[0]?.slice(0, 2) ?? 'АП').toUpperCase()
}
