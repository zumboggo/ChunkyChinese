import { describe, expect, it } from 'vitest'
import { buildReadingProgress, countReadingDifficulty, mergeReaderSessionRecords, qualifyReadingSession, readingChallengePercent, shouldCountFocusedReadingSecond } from './readingProgress'
import type { ReaderSession, ReaderWordToken, VocabWord } from './types'

function session(index: number, wpm: number, challenge = 20, phase = 1): ReaderSession {
  const seconds = 300
  const words = Math.round((wpm * seconds) / 60)
  return {
    id: `session-${index}`, bookId: 'book', packId: 'pack',
    startedAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString(), endedAt: new Date(Date.UTC(2026, 0, index + 1, 0, 5)).toISOString(),
    activeSeconds: seconds, wordsRead: words, sentenceIdsRead: [`sentence-${index}`],
    measurementVersion: 1, focusedActiveSeconds: seconds, focusedWordsRead: words,
    knownTokenCount: 80, learningTokenCount: challenge, newTokenCount: 0,
    challengePercent: challenge, progressQualified: true, baselinePhase: phase,
    updatedAt: new Date(Date.UTC(2026, 0, index + 1, 0, 5)).toISOString(),
  }
}

function word(id: string, patch: Partial<VocabWord> = {}): VocabWord {
  return { id, word: id, meaning: id, status: 'new', seenCount: 0, correctCount: 0, wrongCount: 0, listenedSeconds: 0, createdAt: '', updatedAt: '', ...patch }
}

describe('difficulty-aware reading progress', () => {
  it('counts token occurrences and treats unsaved Chinese as new', () => {
    const known = word('熟', { status: 'known', fsrsState: 'Review', fsrsIntervalDays: 30, fsrsDueAt: '2099-01-01T00:00:00.000Z' })
    const learning = word('学', { fsrsState: 'Learning', fsrsRepetitions: 2 })
    const tokens: ReaderWordToken[] = [
      { id: '1', text: '熟', index: 0, isChinese: true, word: known },
      { id: '2', text: '学', index: 1, isChinese: true, word: learning },
      { id: '3', text: '新', index: 2, isChinese: true },
      { id: '4', text: '。', index: 3, isChinese: false },
    ]
    const counts = countReadingDifficulty(tokens)
    expect(counts).toEqual({ known: 1, learning: 1, fresh: 1, total: 3 })
    expect(readingChallengePercent(counts)).toBe(66.7)
  })

  it('requires both three focused minutes and 75 words', () => {
    expect(qualifyReadingSession(session(0, 15))).toBe(true)
    expect(qualifyReadingSession({ ...session(0, 15), focusedActiveSeconds: 179 })).toBe(false)
    expect(qualifyReadingSession({ ...session(0, 15), focusedWordsRead: 74 })).toBe(false)
    expect(qualifyReadingSession({ ...session(0, 15), measurementVersion: undefined })).toBe(false)
  })

  it('pauses focused timing for audio, overlays, hidden tabs, and inactivity', () => {
    const base = { lastInteractionAt: 1_000, now: 2_000, documentHidden: false, listening: false, overlayOpen: false }
    expect(shouldCountFocusedReadingSecond(base)).toBe(true)
    expect(shouldCountFocusedReadingSecond({ ...base, listening: true })).toBe(false)
    expect(shouldCountFocusedReadingSecond({ ...base, overlayOpen: true })).toBe(false)
    expect(shouldCountFocusedReadingSecond({ ...base, documentHidden: true })).toBe(false)
    expect(shouldCountFocusedReadingSecond({ ...base, now: 61_001 })).toBe(false)
  })

  it('builds an Individuals baseline and flags an unusual high point', () => {
    const baseline = Array.from({ length: 12 }, (_, index) => session(index, 20 + (index % 3), 10 + index))
    const summary = buildReadingProgress([...baseline, session(12, 60, 21)])
    expect(summary.baselineCount).toBe(12)
    expect(summary.points[0].center).not.toBeNull()
    expect(summary.points.at(-1)?.signal).toBe('high')
    expect(summary.status).toBe('positive')
  })

  it('excludes legacy and short sessions and preserves baseline phases', () => {
    const phase1 = Array.from({ length: 12 }, (_, index) => session(index, 20 + (index % 2), 20, 1))
    const phase2 = Array.from({ length: 12 }, (_, index) => session(index + 12, 30 + (index % 2), 20, 2))
    const legacy = { ...session(30, 99), measurementVersion: undefined }
    const summary = buildReadingProgress([...phase1, ...phase2, legacy])
    expect(summary.points).toHaveLength(24)
    expect(new Set(summary.points.map(point => point.phase))).toEqual(new Set([1, 2]))
    expect(summary.points.filter(point => point.phase === 1).every(point => point.center !== null)).toBe(true)
    expect(summary.points.filter(point => point.phase === 2).every(point => point.center !== null)).toBe(true)
  })

  it('merges cloud sessions idempotently with latest-write-wins', () => {
    const older = session(0, 20)
    const newer = { ...older, focusedWordsRead: 200, updatedAt: '2026-03-01T00:00:00.000Z' }
    const remoteOnly = session(1, 22)
    expect(mergeReaderSessionRecords([older], [newer, remoteOnly]).pulled).toEqual([newer, remoteOnly])
    expect(mergeReaderSessionRecords([newer, remoteOnly], [newer, remoteOnly])).toEqual({ pulled: [], toPush: [] })
    expect(mergeReaderSessionRecords([newer], [older]).toPush).toEqual([newer])
  })
})
