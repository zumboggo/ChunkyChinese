import type { FlashcardDeckId, VocabDeckId, VocabWord } from './types'

export const ALL_FLASHCARD_DECK_ID: FlashcardDeckId = 'all'
export const ORIGINAL_DECK_ID: VocabDeckId = 'original'
export const SAVED_FROM_READING_DECK_ID: VocabDeckId = 'saved-from-reading'

export const FLASHCARD_DECKS: ReadonlyArray<{
  id: FlashcardDeckId
  name: string
  description: string
}> = [
  {
    id: ALL_FLASHCARD_DECK_ID,
    name: 'All',
    description: 'Every active word, with one shared mastery record.',
  },
  {
    id: ORIGINAL_DECK_ID,
    name: 'Original Deck',
    description: 'Your original and imported vocabulary.',
  },
  {
    id: SAVED_FROM_READING_DECK_ID,
    name: 'Saved from Reading',
    description: 'Words saved while reading.',
  },
]

const VOCAB_DECK_IDS = new Set<VocabDeckId>([
  ORIGINAL_DECK_ID,
  SAVED_FROM_READING_DECK_ID,
])

export function effectiveWordDeckIds(word: VocabWord): VocabDeckId[] {
  if (word.deckIds?.length) {
    return uniqueDeckIds(word.deckIds)
  }

  // Words created before deck support form the initial Original Deck. Reader
  // saves also appear in Saved from Reading, so existing progress is preserved
  // without copying the word or its FSRS state.
  return word.readingAddedAt
    ? [ORIGINAL_DECK_ID, SAVED_FROM_READING_DECK_ID]
    : [ORIGINAL_DECK_ID]
}

export function wordIsInSelectedFlashcardDecks(
  word: VocabWord,
  selectedDeckIds: FlashcardDeckId[],
): boolean {
  if (selectedDeckIds.includes(ALL_FLASHCARD_DECK_ID)) return true
  const selected = new Set(selectedDeckIds)
  return effectiveWordDeckIds(word).some((deckId) => selected.has(deckId))
}

export function sanitizeSelectedFlashcardDeckIds(value: unknown): FlashcardDeckId[] {
  if (!Array.isArray(value)) return [ALL_FLASHCARD_DECK_ID]
  const selected = Array.from(
    new Set(value.filter((id): id is FlashcardDeckId => id === ALL_FLASHCARD_DECK_ID || VOCAB_DECK_IDS.has(id as VocabDeckId))),
  )
  if (selected.includes(ALL_FLASHCARD_DECK_ID)) return [ALL_FLASHCARD_DECK_ID]
  return selected.length > 0 ? selected : [ALL_FLASHCARD_DECK_ID]
}

export function uniqueDeckIds(deckIds: readonly string[]): VocabDeckId[] {
  return Array.from(new Set(deckIds.filter((id): id is VocabDeckId => VOCAB_DECK_IDS.has(id as VocabDeckId))))
}
