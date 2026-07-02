import { describe, expect, it } from 'vitest'
import {
  readerComfortLabel,
  sortReaderBooksByKnownPercent,
  storyChunkSentenceMetrics,
} from './storyFeatures'
import type { ReaderBook, VocabWord } from './types'

function word(text: string, interval = 30): VocabWord {
  return {
    id: `word-${text}`,
    word: text,
    meaning: text,
    status: 'review',
    fsrsState: 'Review',
    fsrsIntervalDays: interval,
    fsrsDueAt: '2099-01-01T00:00:00.000Z',
    seenCount: 1,
    correctCount: 1,
    wrongCount: 0,
    listenedSeconds: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

function book(id: string, title: string): ReaderBook {
  return {
    id,
    packId: 'test',
    title,
    book: 1,
    chapterStart: 1,
    chapterEnd: 1,
    stories: [],
  }
}

describe('storyFeatures', () => {
  it('sorts reader books by known percentage while pinning resume book', () => {
    const books = [book('hard', 'Hard'), book('resume', 'Resume'), book('easy', 'Easy')]
    const sorted = sortReaderBooksByKnownPercent(
      books,
      new Map([
        ['hard', { knownPercent: 20 }],
        ['resume', { knownPercent: 50 }],
        ['easy', { knownPercent: 95 }],
      ]),
      'resume',
    )

    expect(sorted.map((item) => item.id)).toEqual(['resume', 'easy', 'hard'])
  })

  it('labels reading comfort bands', () => {
    expect(readerComfortLabel(90)).toBe('Easy pick')
    expect(readerComfortLabel(75)).toBe('Good stretch')
    expect(readerComfortLabel(40)).toBe('Hard mode')
  })

  it('counts known, learning, and unsaved words in a story chunk sentence', () => {
    const metrics = storyChunkSentenceMetrics('我喜欢猫和龙', [
      word('我'),
      word('喜欢'),
      word('猫', 2),
    ])

    expect(metrics.knownWords).toEqual(['我', '喜欢'])
    expect(metrics.learningWords).toEqual(['猫'])
    expect(metrics.unsavedWords).toContain('龙')
  })
})
