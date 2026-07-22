import { describe, expect, it } from 'vitest'
import {
  buildAutomaticReaderQueue,
  buildReaderQueue,
  promoteLatestReaderBook,
  reorderReaderQueue,
} from './readerQueue'
import type { ReaderBook, ReaderProgress, ReaderQueueState } from './types'

function book(id: string, packId: string, title: string, chapterStart = 1): ReaderBook {
  return {
    id,
    packId,
    title,
    book: 1,
    chapterStart,
    chapterEnd: chapterStart,
    stories: [],
  }
}

function progress(bookId: string, updatedAt: string, completedAt?: string): ReaderProgress {
  return {
    id: `reader-progress:${bookId}`,
    packId: bookId.startsWith('lms') ? 'lms-books' : 'other',
    bookId,
    sentenceIndex: 2,
    updatedAt,
    completedAt,
  }
}

const emptyState: ReaderQueueState = {
  version: 1,
  orderedBookIds: [],
  excludedBookIds: [],
  updatedAt: '',
}

describe('Reader playlist queue', () => {
  const books = [
    book('story', 'generated-stories', 'A Story'),
    book('novel-low', 'sherlock-holmes', 'Lower Novel'),
    book('lms-2', 'lms-books', 'LMS 6-10', 6),
    book('novel-high', 'just-friends', 'Higher Novel'),
    book('lms-1', 'lms-books', 'LMS 1-5', 1),
  ]
  const coverage = new Map([
    ['novel-low', 45],
    ['novel-high', 82],
    ['story', 99],
  ])

  it('orders LMS series first, then novels and stories by comprehensibility', () => {
    expect(buildAutomaticReaderQueue(books, [], coverage).map((item) => item.id)).toEqual([
      'lms-1',
      'lms-2',
      'novel-high',
      'novel-low',
      'story',
    ])
  })

  it('skips completed and excluded books while preserving manual order', () => {
    const state = {
      ...emptyState,
      orderedBookIds: ['novel-low', 'lms-2'],
      excludedBookIds: ['novel-high'],
    }
    const rows = [progress('lms-1', '2026-07-20T00:00:00Z', '2026-07-21T00:00:00Z')]
    expect(buildReaderQueue(books, rows, coverage, state).map((item) => item.id)).toEqual([
      'novel-low',
      'lms-2',
      'story',
    ])
  })

  it('promotes the latest unfinished queued book without losing the remaining order', () => {
    const queue = buildReaderQueue(books, [], coverage, emptyState)
    const rows = [
      progress('lms-1', '2026-07-20T00:00:00Z'),
      progress('novel-low', '2026-07-22T00:00:00Z'),
    ]
    expect(promoteLatestReaderBook(queue, rows).map((item) => item.id)).toEqual([
      'novel-low',
      'lms-1',
      'lms-2',
      'novel-high',
      'story',
    ])
  })

  it('reorders deterministically and ignores moves beyond queue bounds', () => {
    const queue = buildReaderQueue(books, [], coverage, emptyState)
    expect(reorderReaderQueue(queue, 'lms-2', -1).slice(0, 2)).toEqual(['lms-2', 'lms-1'])
    expect(reorderReaderQueue(queue, 'lms-1', -1)).toEqual(queue.map((item) => item.id))
  })
})
