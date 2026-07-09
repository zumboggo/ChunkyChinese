import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import {
  getAllWords,
  repairAudioClipLinks,
  saveAudioClip,
  upsertWords,
} from './db'
import type { AudioClip, VocabWord } from './types'

function makeWord(id: string, word: string, meaning: string): VocabWord {
  const now = new Date().toISOString()
  return {
    id,
    word,
    meaning,
    status: 'new',
    seenCount: 0,
    correctCount: 0,
    wrongCount: 0,
    listenedSeconds: 0,
    createdAt: now,
    updatedAt: now,
  }
}

function makeMeaningClip(id: string, wordId: string, meaning: string): AudioClip {
  return {
    id,
    type: 'meaning',
    label: meaning,
    filename: `${meaning.replaceAll(' ', '-')}.mp3`,
    path: `audio/meanings/${meaning.replaceAll(' ', '-')}.mp3`,
    blob: new Blob(['test audio']),
    linkedWordIds: [wordId],
    language: 'en-US',
    provider: 'test',
    createdAt: new Date().toISOString(),
  }
}

describe('audio clip link repair', () => {
  it('reconnects manifest-linked meaning clips to existing words', async () => {
    const suffix = crypto.randomUUID()
    const wordId = `word:test-link-${suffix}`
    const clipId = `meaning:test-link-${suffix}`
    await upsertWords([makeWord(wordId, `test-link-${suffix}`, 'test meaning')])
    await saveAudioClip(makeMeaningClip(clipId, wordId, 'test meaning'))

    await expect(repairAudioClipLinks()).resolves.toBe(1)

    const repairedWord = (await getAllWords()).find((word) => word.id === wordId)
    expect(repairedWord?.audioMeaningId).toBe(clipId)
  })
})
