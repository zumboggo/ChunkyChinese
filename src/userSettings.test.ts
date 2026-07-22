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
    expect(settings.readerListeningRepeats).toBe(3)
    expect(settings.readerListeningPauseFactor).toBe(1)
    expect(settings.readerListeningAutoAdvance).toBe(true)
    expect(settings.readerPinyinMode).toBe('adaptive')
    expect(settings.readerShowEnglish).toBe(true)
    expect(settings.selectedFlashcardDeckIds).toEqual(['all'])
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

  it('preserves Reader choices after the one-time playlist migration', () => {
    const { settings } = sanitizeUserSettings({
      ...DEFAULT_USER_SETTINGS,
      readerPinyinMode: 'none',
      readerListeningRepeats: 4,
      readerListeningPauseFactor: 1.5,
      readerShowEnglish: false,
    })
    expect(settings.readerPinyinMode).toBe('none')
    expect(settings.readerListeningRepeats).toBe(4)
    expect(settings.readerListeningPauseFactor).toBe(1.5)
    expect(settings.readerShowEnglish).toBe(false)
  })
})
