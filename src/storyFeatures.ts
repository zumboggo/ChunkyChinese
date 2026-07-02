import {
  collectReaderComprehensionTokens,
  readerComprehensionCategory,
  readerMaxChineseWordLength,
} from './adaptiveText'
import type { ReaderBook, VocabWord } from './types'

export type ReaderComfortLabel = 'Easy pick' | 'Good stretch' | 'Hard mode'

export interface ReaderComprehensionLike {
  knownPercent: number
}

export interface StoryChunkMetrics {
  knownWords: string[]
  learningWords: string[]
  unsavedWords: string[]
  tappedUnsavedWords: string[]
  savedWords: string[]
}

export interface StoryChunkReceipt {
  title: string
  sentencesRead: number
  targetSentences: number
  activeSeconds: number
  progressPercent: number
  knownWords: number
  learningWords: number
  unsavedWordsTapped: number
  wordsSaved: number
}

export function readerComfortLabel(knownPercent: number): ReaderComfortLabel {
  if (knownPercent >= 85) return 'Easy pick'
  if (knownPercent >= 65) return 'Good stretch'
  return 'Hard mode'
}

export function sortReaderBooksByKnownPercent<T extends ReaderBook>(
  books: T[],
  comprehensionByBook: Map<string, ReaderComprehensionLike>,
  resumeBookId?: string,
): T[] {
  return [...books].sort((a, b) => {
    if (resumeBookId && a.id === resumeBookId && b.id !== resumeBookId) return -1
    if (resumeBookId && b.id === resumeBookId && a.id !== resumeBookId) return 1
    const aKnown = comprehensionByBook.get(a.id)?.knownPercent ?? -1
    const bKnown = comprehensionByBook.get(b.id)?.knownPercent ?? -1
    return bKnown - aKnown || a.title.localeCompare(b.title)
  })
}

export function emptyStoryChunkMetrics(): StoryChunkMetrics {
  return {
    knownWords: [],
    learningWords: [],
    unsavedWords: [],
    tappedUnsavedWords: [],
    savedWords: [],
  }
}

export function storyChunkSentenceMetrics(text: string, vocab: VocabWord[]): StoryChunkMetrics {
  const wordMap = new Map(vocab.map((word) => [word.word, word]))
  const maxWordLength = readerMaxChineseWordLength(wordMap)
  const metrics = emptyStoryChunkMetrics()

  for (const token of collectReaderComprehensionTokens(text, wordMap, maxWordLength)) {
    if (!token.word) {
      metrics.unsavedWords = addUnique(metrics.unsavedWords, token.text)
      continue
    }
    const category = readerComprehensionCategory(token.word)
    if (category === 'known') {
      metrics.knownWords = addUnique(metrics.knownWords, token.word.word)
    } else if (category === 'learning') {
      metrics.learningWords = addUnique(metrics.learningWords, token.word.word)
    }
  }

  return metrics
}

export function mergeStoryChunkMetrics(
  current: StoryChunkMetrics,
  next: Partial<StoryChunkMetrics>,
): StoryChunkMetrics {
  return {
    knownWords: mergeUnique(current.knownWords, next.knownWords ?? []),
    learningWords: mergeUnique(current.learningWords, next.learningWords ?? []),
    unsavedWords: mergeUnique(current.unsavedWords, next.unsavedWords ?? []),
    tappedUnsavedWords: mergeUnique(current.tappedUnsavedWords, next.tappedUnsavedWords ?? []),
    savedWords: mergeUnique(current.savedWords, next.savedWords ?? []),
  }
}

function mergeUnique(a: string[], b: string[]): string[] {
  return Array.from(new Set([...a, ...b]))
}

function addUnique(values: string[], value: string): string[] {
  return values.includes(value) ? values : [...values, value]
}
