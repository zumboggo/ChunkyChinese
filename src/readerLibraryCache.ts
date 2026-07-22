import {
  collectReaderComprehensionTokens,
  readerComprehensionCategory,
  readerMaxChineseWordLength,
} from './adaptiveText'
import type { ReaderBook, VocabWord } from './types'

export type ReaderComprehensionSummary = {
  knownPercent: number
  known: number
  learning: number
  new: number
  total: number
}

export type ReaderBookComprehension = ReaderComprehensionSummary & {
  chapters: Array<
    ReaderComprehensionSummary & {
      id: string
      chapter: number
      title: string
    }
  >
}

const CACHE_KEY = 'chunky-reader-comprehension-v1'

export function getCachedReaderComprehensionByBook(
  books: ReaderBook[],
  vocab: VocabWord[],
): Map<string, ReaderBookComprehension> {
  const fingerprint = readerLibraryFingerprint(books, vocab)
  try {
    const saved = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null') as {
      fingerprint?: string
      summaries?: Record<string, ReaderBookComprehension>
    } | null
    if (saved?.fingerprint === fingerprint && saved.summaries) {
      return new Map(Object.entries(saved.summaries))
    }
  } catch {
    // Recompute below if storage is unavailable or an old cache is malformed.
  }

  const summaries = computeReaderComprehensionByBook(books, vocab)
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      fingerprint,
      summaries: Object.fromEntries(summaries),
    }))
  } catch {
    // The cache is an optimization; Reader remains fully functional without it.
  }
  return summaries
}

export function clearReaderComprehensionCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY)
  } catch {
    // Ignore storage restrictions.
  }
}

export function readerLibraryFingerprint(books: ReaderBook[], vocab: VocabWord[]): string {
  let hash = 2166136261
  const add = (value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index)
      hash = Math.imul(hash, 16777619)
    }
  }
  for (const book of books) {
    add(`${book.packId}:${book.id}:${book.stories.length}:`)
    for (const story of book.stories) {
      add(`${story.id}:${story.title}:${story.sentences.length}:`)
      for (const sentence of story.sentences) add(`${sentence.id}:${sentence.chinese};`)
    }
  }
  for (const word of vocab) {
    add(`${word.id}:${word.word}:${readerComprehensionCategory(word)};`)
  }
  return `${books.length}:${vocab.length}:${hash >>> 0}`
}

function computeReaderComprehensionByBook(
  books: ReaderBook[],
  vocab: VocabWord[],
): Map<string, ReaderBookComprehension> {
  const summaries = new Map<string, ReaderBookComprehension>()
  const wordMap = new Map(vocab.map((word) => [word.word, word]))
  const maxWordLength = readerMaxChineseWordLength(wordMap)
  for (const book of books) {
    const chapters = book.stories.map((story) => ({
      ...summarizeReaderTexts(story.sentences.map((sentence) => sentence.chinese), wordMap, maxWordLength),
      id: story.id,
      chapter: story.chapter,
      title: story.title,
    }))
    const bookSummary = summarizeReaderTexts(
      book.stories.flatMap((story) => story.sentences.map((sentence) => sentence.chinese)),
      wordMap,
      maxWordLength,
    )
    summaries.set(book.id, { ...bookSummary, chapters })
  }
  return summaries
}

function summarizeReaderTexts(
  texts: string[],
  wordMap: Map<string, VocabWord>,
  maxWordLength: number,
): ReaderComprehensionSummary {
  const categories = new Map<string, 'known' | 'learning' | 'new'>()
  for (const text of texts) {
    for (const token of collectReaderComprehensionTokens(text, wordMap, maxWordLength)) {
      const key = token.word?.id ?? `unsaved:${token.text}`
      if (!categories.has(key)) categories.set(key, readerComprehensionCategory(token.word))
    }
  }

  let known = 0
  let learning = 0
  let fresh = 0
  for (const category of categories.values()) {
    if (category === 'known') known += 1
    else if (category === 'learning') learning += 1
    else fresh += 1
  }
  const total = categories.size
  return { known, learning, new: fresh, total, knownPercent: total ? Math.round((known / total) * 100) : 0 }
}
