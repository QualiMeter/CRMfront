import { httpApi } from './httpApi'

// Реальный Railway API с точечным fallback на mock при недоступности чтения.
export const api = httpApi
