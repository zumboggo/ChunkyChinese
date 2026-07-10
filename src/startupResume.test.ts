import { describe, expect, it } from 'vitest'
import {
  STARTUP_RESUME_KEY,
  loadStartupResumeState,
  saveStartupResumeState,
  validateStartupResumeState,
} from './startupResume'

function memoryStorage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  }
}

describe('startup resume state', () => {
  it('round-trips a minimal flashcard session', () => {
    const storage = memoryStorage()
    saveStartupResumeState({
      destination: 'flashcards',
      sessionId: 'session-1',
      queueIds: ['one', 'two'],
      currentId: 'two',
      completedIds: ['one'],
    }, storage)
    expect(loadStartupResumeState(storage)).toMatchObject({
      version: 1,
      destination: 'flashcards',
      currentId: 'two',
    })
    expect(storage.getItem(STARTUP_RESUME_KEY)).toContain('session-1')
  })

  it('rejects stale, completed, and malformed sessions', () => {
    const old = new Date('2025-01-01T00:00:00Z').toISOString()
    expect(validateStartupResumeState({ version: 1, destination: 'flashcards', updatedAt: old }, Date.parse('2026-07-10'))).toBeNull()
    expect(validateStartupResumeState({ version: 1, destination: 'flashcards', updatedAt: new Date().toISOString(), queueIds: ['one'] })).toBeNull()
    expect(validateStartupResumeState({ version: 2, destination: 'dashboard', updatedAt: new Date().toISOString() })).toBeNull()
  })
})
