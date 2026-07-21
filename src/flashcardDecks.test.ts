import { describe, expect, it } from 'vitest'
import {
  ALL_FLASHCARD_DECK_ID,
  ORIGINAL_DECK_ID,
  SAVED_FROM_READING_DECK_ID,
  effectiveWordDeckIds,
  sanitizeSelectedFlashcardDeckIds,
  wordIsInSelectedFlashcardDecks,
} from './flashcardDecks'
import type { VocabWord } from './types'

function makeWord(patch: Partial<VocabWord> = {}): VocabWord {
  return {
    id: 'word:test',
    word: '学',
    meaning: 'study',
    status: 'new',
    seenCount: 0,
    correctCount: 0,
    wrongCount: 0,
    listenedSeconds: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...patch,
  }
}

describe('flashcard decks', () => {
  it('places pre-deck words in Original Deck and overlaps existing reader saves', () => {
    expect(effectiveWordDeckIds(makeWord())).toEqual([ORIGINAL_DECK_ID])
    expect(effectiveWordDeckIds(makeWord({ readingAddedAt: '2026-01-02T00:00:00.000Z' }))).toEqual([
      ORIGINAL_DECK_ID,
      SAVED_FROM_READING_DECK_ID,
    ])
  })

  it('respects explicit membership for future reader-only saves', () => {
    const word = makeWord({ deckIds: [SAVED_FROM_READING_DECK_ID] })
    expect(wordIsInSelectedFlashcardDecks(word, [ORIGINAL_DECK_ID])).toBe(false)
    expect(wordIsInSelectedFlashcardDecks(word, [SAVED_FROM_READING_DECK_ID])).toBe(true)
    expect(wordIsInSelectedFlashcardDecks(word, [ALL_FLASHCARD_DECK_ID])).toBe(true)
  })

  it('sanitizes persisted selections and lets All supersede individual decks', () => {
    expect(sanitizeSelectedFlashcardDeckIds(undefined)).toEqual([ALL_FLASHCARD_DECK_ID])
    expect(sanitizeSelectedFlashcardDeckIds([ORIGINAL_DECK_ID, SAVED_FROM_READING_DECK_ID])).toEqual([
      ORIGINAL_DECK_ID,
      SAVED_FROM_READING_DECK_ID,
    ])
    expect(sanitizeSelectedFlashcardDeckIds([ALL_FLASHCARD_DECK_ID, ORIGINAL_DECK_ID])).toEqual([
      ALL_FLASHCARD_DECK_ID,
    ])
  })
})
