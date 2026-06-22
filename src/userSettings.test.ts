import { describe, expect, it } from 'vitest'
import { DEFAULT_USER_SETTINGS, sanitizeUserSettings } from './db'

describe('reader listening settings', () => {
  it('adds defaults to settings saved before Listening Mode existed', () => {
    const { settings, cleaned } = sanitizeUserSettings({
      readingGoalWords: 1000,
      readingGoalPages: 10,
    })
    expect(cleaned).toBe(true)
    expect(settings.readerListeningRate).toBe(0.8)
    expect(settings.readerListeningRepeats).toBe(2)
    expect(settings.readerListeningAutoAdvance).toBe(true)
  })

  it('clamps malformed listening settings to supported controls', () => {
    const { settings } = sanitizeUserSettings({
      ...DEFAULT_USER_SETTINGS,
      readerListeningRate: 4,
      readerListeningRepeats: 99,
    })
    expect(settings.readerListeningRate).toBe(1.2)
    expect(settings.readerListeningRepeats).toBe(5)
  })
})
