import { describe, expect, it } from 'vitest'
import { analyzeDataHealthRecords } from './dataHealth'
import { readerLibraryFingerprint } from './readerLibraryCache'
import { readerBookOfflineAssetUrls } from './readerOffline'
import type { ListeningEvent, ReaderBook, ReaderProgress, ReaderSession } from './types'

function book(): ReaderBook {
  return {
    id: 'book-1',
    packId: 'pack-1',
    title: 'Test Book',
    book: 1,
    chapterStart: 1,
    chapterEnd: 1,
    coverImage: 'cover.webp',
    illustrations: [{
      id: 'art-1',
      imageFilename: 'reader-packs/pack-1/art.webp',
      alt: 'Art',
      sentenceStart: 1,
      sentenceEnd: 1,
    }],
    stories: [{
      id: 'story-1',
      title: 'Chapter One',
      book: 1,
      chapter: 1,
      newWords: [],
      sentences: [{
        id: 'sentence-1',
        storyId: 'story-1',
        index: 0,
        chinese: '你好',
        pinyin: 'nǐ hǎo',
        english: 'Hello',
        targetWords: [],
        audioClipId: 'audio-1',
        audioFilename: 'reader-packs/pack-1/audio.mp3',
        ssmlFilename: '',
      }],
    }],
  }
}

describe('Reader improvements', () => {
  it('invalidates the comprehension cache when text changes', () => {
    const original = book()
    const changed = book()
    changed.stories[0].sentences[0].chinese = '再见'
    expect(readerLibraryFingerprint([original], [])).not.toBe(readerLibraryFingerprint([changed], []))
  })

  it('collects cover, illustration, and audio for offline use', () => {
    const urls = readerBookOfflineAssetUrls(book())
    expect(urls).toContain('/reader-packs/pack-1/cover.webp')
    expect(urls).toContain('/reader-packs/pack-1/art.webp')
    expect(urls).toContain('/reader-packs/pack-1/audio.mp3')
  })
})

describe('data health analysis', () => {
  it('detects capped timing, duplicate events, bad sessions, and missing progress', () => {
    const event: ListeningEvent = {
      id: 'event-1',
      timestamp: '2026-01-01T00:00:00.000Z',
      type: 'fsrs_rating',
      itemType: 'word',
      itemId: 'word-1',
      source: 'flashcards',
      seconds: 120,
    }
    const duplicate = { ...event, id: 'event-2' }
    const session: ReaderSession = {
      id: 'session-1',
      bookId: 'missing',
      packId: 'missing',
      startedAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:01:00.000Z',
      activeSeconds: 10_000,
      wordsRead: 0,
      sentenceIdsRead: [],
    }
    const progress: ReaderProgress = {
      id: 'progress-1',
      bookId: 'missing',
      packId: 'missing',
      sentenceIndex: 99,
      updatedAt: '2026-01-01T00:00:00.000Z',
    }
    const report = analyzeDataHealthRecords({
      events: [event, duplicate],
      sessions: [session],
      progress: [progress],
      books: [],
    })
    expect(report.invalidStudyEvents).toBe(2)
    expect(report.duplicateStudyEvents).toBe(1)
    expect(report.implausibleReaderSessions).toBe(1)
    expect(report.invalidReaderProgress).toBe(1)
    expect(report.healthy).toBe(false)
  })

  it('accepts healthy records', () => {
    const healthyBook = book()
    const report = analyzeDataHealthRecords({ events: [], sessions: [], progress: [], books: [healthyBook] })
    expect(report.healthy).toBe(true)
    expect(report.issueCount).toBe(0)
  })
})
