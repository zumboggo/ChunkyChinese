import type { ReaderBook, ReaderProgress, ReaderQueueState } from './types'

export type ReadingBookCategory = 'novel' | 'story'

const NOVEL_PACK_IDS = new Set([
  'lms-books',
  'sherlock-holmes',
  'rise-of-the-monkey-king',
  'just-friends',
  'can-i-dance',
  'john-gospel',
])

export const EMPTY_READER_QUEUE_STATE: ReaderQueueState = {
  version: 1,
  orderedBookIds: [],
  excludedBookIds: [],
  updatedAt: '',
}

export function readingBookCategory(book: ReaderBook): ReadingBookCategory {
  if (book.packId === 'generated-stories') return 'story'
  return NOVEL_PACK_IDS.has(book.packId) ? 'novel' : 'novel'
}

export function buildAutomaticReaderQueue(
  books: ReaderBook[],
  progressRows: ReaderProgress[],
  knownPercentByBook: ReadonlyMap<string, number>,
): ReaderBook[] {
  const progressByBook = new Map(progressRows.map((progress) => [progress.bookId, progress]))
  const unfinished = books.filter((book) => !progressByBook.get(book.id)?.completedAt)
  const compareCoverage = (a: ReaderBook, b: ReaderBook) =>
    (knownPercentByBook.get(b.id) ?? 0) - (knownPercentByBook.get(a.id) ?? 0) ||
    a.title.localeCompare(b.title)

  const lms = unfinished
    .filter((book) => book.packId === 'lms-books')
    .sort((a, b) => a.book - b.book || a.chapterStart - b.chapterStart || a.title.localeCompare(b.title))
  const novels = unfinished
    .filter((book) => book.packId !== 'lms-books' && readingBookCategory(book) === 'novel')
    .sort(compareCoverage)
  const stories = unfinished
    .filter((book) => readingBookCategory(book) === 'story')
    .sort(compareCoverage)
  return [...lms, ...novels, ...stories]
}

export function buildReaderQueue(
  books: ReaderBook[],
  progressRows: ReaderProgress[],
  knownPercentByBook: ReadonlyMap<string, number>,
  state: ReaderQueueState,
): ReaderBook[] {
  const automatic = buildAutomaticReaderQueue(books, progressRows, knownPercentByBook)
  const byId = new Map(automatic.map((book) => [book.id, book]))
  const excluded = new Set(state.excludedBookIds)
  const manual = state.orderedBookIds
    .map((id) => byId.get(id))
    .filter((book): book is ReaderBook => book !== undefined)
    .filter((book) => !excluded.has(book.id))
  const manualIds = new Set(manual.map((book) => book.id))
  const appended = automatic.filter((book) => !manualIds.has(book.id) && !excluded.has(book.id))
  return [...manual, ...appended]
}

export function promoteLatestReaderBook(
  queue: ReaderBook[],
  progressRows: ReaderProgress[],
): ReaderBook[] {
  const queuedIds = new Set(queue.map((book) => book.id))
  const latest = [...progressRows]
    .filter((progress) => !progress.completedAt && queuedIds.has(progress.bookId))
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0]
  if (!latest || queue[0]?.id === latest.bookId) return queue
  const recent = queue.find((book) => book.id === latest.bookId)
  return recent ? [recent, ...queue.filter((book) => book.id !== recent.id)] : queue
}

export function reorderReaderQueue(
  queue: ReaderBook[],
  bookId: string,
  delta: -1 | 1,
): string[] {
  const ids = queue.map((book) => book.id)
  const index = ids.indexOf(bookId)
  const destination = index + delta
  if (index < 0 || destination < 0 || destination >= ids.length) return ids
  ;[ids[index], ids[destination]] = [ids[destination], ids[index]]
  return ids
}
