import { describe, expect, it } from 'vitest'
import {
  cappedFlashcardStudySeconds,
  shouldCountActiveStudySecond,
  studySecondsForEvent,
} from './studyTime'
import type { ListeningEvent } from './types'

function event(patch: Partial<ListeningEvent>): ListeningEvent {
  return {
    id: 'event:test',
    timestamp: '2026-01-01T00:00:00.000Z',
    type: 'fsrs_rating',
    itemType: 'word',
    itemId: 'word:test',
    ...patch,
  }
}

describe('study time', () => {
  it('caps every flashcard presentation at 60 seconds', () => {
    expect(cappedFlashcardStudySeconds(1_000, 1_100)).toBe(1)
    expect(cappedFlashcardStudySeconds(1_000, 31_000)).toBe(30)
    expect(cappedFlashcardStudySeconds(1_000, 121_000)).toBe(60)
  })

  it('pauses active study after 60 seconds without activity', () => {
    expect(shouldCountActiveStudySecond(1_000, 61_000)).toBe(true)
    expect(shouldCountActiveStudySecond(1_000, 61_001)).toBe(false)
  })

  it('counts capped rating time but not the duplicate flashcard set summary', () => {
    expect(studySecondsForEvent(event({ source: 'flashcards', seconds: 90 }))).toBe(60)
    expect(studySecondsForEvent(event({ source: 'flashcards' }))).toBe(8)
    expect(studySecondsForEvent(event({
      type: 'complete',
      itemType: 'lesson',
      source: 'flashcards',
      seconds: 120,
    }))).toBe(0)
  })
})
