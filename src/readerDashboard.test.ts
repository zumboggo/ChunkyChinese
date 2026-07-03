import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import {
  archiveWord,
  buildReadingSeries,
  getAllWords,
  getDashboardStats,
  isActiveVocabWord,
  restoreArchivedWord,
  saveReaderVocabularyWord,
} from './db'
import { tokenizeReaderText } from './adaptiveText'
import { shouldCountReaderActiveSecond } from './readerActivity'
import type { ReaderSession, VocabWord } from './types'

function makeSession(startedAt: Date, wordsRead: number, activeSeconds: number): ReaderSession {
  return {
    id: `reader-session:test:${crypto.randomUUID()}`,
    bookId: 'test-book',
    packId: 'test-pack',
    startedAt: startedAt.toISOString(),
    activeSeconds,
    wordsRead,
    sentenceIdsRead: [],
    updatedAt: startedAt.toISOString(),
  }
}

describe('reader dashboard tracking', () => {
  it('pauses active reading time after one minute of inactivity', () => {
    expect(shouldCountReaderActiveSecond(1_000, 61_000)).toBe(true)
    expect(shouldCountReaderActiveSecond(1_000, 61_001)).toBe(false)
  })

  it('builds a 12-week WPM trend from active reading seconds', () => {
    const now = new Date()
    const sessions = [
      makeSession(now, 120, 60),
      makeSession(new Date(now.getTime() - 8 * 86_400_000), 90, 90),
    ]
    const series = buildReadingSeries(sessions, 12)

    expect(series).toHaveLength(12)
    expect(series.at(-1)?.wpm).toBe(120)
    expect(series.at(-1)?.activeSeconds).toBe(60)
  })

  it('stamps Reader-saved words and excludes archived words from graduated counts', async () => {
    const before = await getDashboardStats()
    const saved = await saveReaderVocabularyWord(`测${crypto.randomUUID().slice(0, 8)}`, 'ce4', 'test')

    const afterSave = await getDashboardStats()
    expect(saved.readingAddedAt).toBeTruthy()
    expect(afterSave.ranges.allTime.readingGraduatedWords).toBe(
      before.ranges.allTime.readingGraduatedWords + 1,
    )

    await archiveWord(saved.id)
    const afterArchive = await getDashboardStats()
    expect(afterArchive.ranges.allTime.readingGraduatedWords).toBe(
      before.ranges.allTime.readingGraduatedWords,
    )
  })

  it('archives and restores without losing progress fields', async () => {
    const saved = await saveReaderVocabularyWord(`读${crypto.randomUUID().slice(0, 8)}`, 'du2', 'read')
    const archived = await archiveWord(saved.id)
    const restored = await restoreArchivedWord(saved.id)
    const stored = (await getAllWords()).find((word) => word.id === saved.id)

    expect(archived?.readingAddedAt).toBe(saved.readingAddedAt)
    expect(restored?.archivedAt).toBeUndefined()
    expect(stored?.readingAddedAt).toBe(saved.readingAddedAt)
  })

  it('does not use archived words for Reader token matches', () => {
    const archivedWord: VocabWord = {
      id: 'word:archived-nihao',
      word: '你好',
      meaning: 'hello',
      status: 'known',
      archivedAt: '2026-01-01T00:00:00.000Z',
      seenCount: 0,
      correctCount: 0,
      wrongCount: 0,
      listenedSeconds: 0,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }

    const tokens = tokenizeReaderText('你好', [archivedWord].filter(isActiveVocabWord))
    expect(tokens.some((token) => token.word?.id === archivedWord.id)).toBe(false)
  })
})
