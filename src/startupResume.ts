export const STARTUP_RESUME_KEY = 'chunky-startup-resume-v1'

export type ResumableDestination = 'dashboard' | 'flashcards' | 'sentenceListening' | 'reader'

export interface StartupResumeState {
  version: 1
  destination: ResumableDestination
  updatedAt: string
  sessionId?: string
  queueIds?: string[]
  currentId?: string
  completedIds?: string[]
  sentenceIndex?: number
  readerPackId?: string
  readerBookId?: string
}

const MAX_RESUME_AGE_MS = 30 * 24 * 60 * 60 * 1000

export function validateStartupResumeState(value: unknown, now = Date.now()): StartupResumeState | null {
  if (!value || typeof value !== 'object') return null
  const state = value as Partial<StartupResumeState>
  if (state.version !== 1 || typeof state.destination !== 'string' || typeof state.updatedAt !== 'string') return null
  if (!['dashboard', 'flashcards', 'sentenceListening', 'reader'].includes(state.destination)) return null
  const updatedAt = Date.parse(state.updatedAt)
  if (!Number.isFinite(updatedAt) || now - updatedAt > MAX_RESUME_AGE_MS || updatedAt > now + 60_000) return null
  if (state.destination === 'flashcards') {
    if (!Array.isArray(state.queueIds) || state.queueIds.length === 0 || typeof state.currentId !== 'string') return null
    if (!state.queueIds.includes(state.currentId)) return null
  }
  if (state.destination === 'reader' && (!state.readerPackId || !state.readerBookId)) return null
  return state as StartupResumeState
}

export function loadStartupResumeState(storage: Pick<Storage, 'getItem'> = localStorage): StartupResumeState | null {
  try {
    const raw = storage.getItem(STARTUP_RESUME_KEY)
    return raw ? validateStartupResumeState(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

export function saveStartupResumeState(
  state: Omit<StartupResumeState, 'version' | 'updatedAt'>,
  storage: Pick<Storage, 'setItem'> = localStorage,
): StartupResumeState {
  const value: StartupResumeState = { ...state, version: 1, updatedAt: new Date().toISOString() }
  storage.setItem(STARTUP_RESUME_KEY, JSON.stringify(value))
  return value
}

export function clearStartupResumeState(storage: Pick<Storage, 'removeItem'> = localStorage): void {
  storage.removeItem(STARTUP_RESUME_KEY)
}
