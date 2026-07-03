import { describe, expect, it } from 'vitest'
import {
  appendGeneratedChapter,
  generatedStoryToReaderBook,
  normalizeGeneratedStoryPayload,
  validateGeneratedStoryCoverage,
} from './generatedStories'
import type { VocabWord } from './types'

function knownWord(text: string): VocabWord {
  return {
    id: `word-${text}`,
    word: text,
    meaning: text,
    status: 'review',
    fsrsState: 'Review',
    fsrsIntervalDays: 30,
    fsrsDueAt: '2099-01-01T00:00:00.000Z',
    seenCount: 1,
    correctCount: 1,
    wrongCount: 0,
    listenedSeconds: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

describe('generatedStories', () => {
  it('normalizes bilingual generated story payloads', () => {
    const story = normalizeGeneratedStoryPayload({
      title: 'Morning Walk',
      sentences: [{ chinese: '我喜欢走路。', english: 'I like walking.' }],
    }, 'walk')

    expect(story.title).toBe('Morning Walk')
    expect(story.prompt).toBe('walk')
    expect(story.sentences).toHaveLength(1)
  })

  it('validates known-word coverage and reports harder drafts', () => {
    const story = normalizeGeneratedStoryPayload({
      title: 'Cat',
      prompt: 'cat',
      unavoidableNewWords: [
        { word: '龙', meaning: 'dragon' },
        { word: '洞', meaning: 'cave' },
        { word: '魔法', meaning: 'magic' },
        { word: '宝石', meaning: 'gem' },
        { word: '森林', meaning: 'forest' },
        { word: '国王', meaning: 'king' },
      ],
      sentences: [{ chinese: '我喜欢猫和龙。', english: 'I like cats and dragons.' }],
    }, 'cat')

    const validation = validateGeneratedStoryCoverage(story, [
      knownWord('我'),
      knownWord('喜欢'),
      knownWord('猫'),
    ])

    expect(validation.knownCoveragePercent).toBeLessThan(95)
    expect(validation.warning).toContain('new words')
  })

  it('converts generated stories into local Reader books', () => {
    const story = normalizeGeneratedStoryPayload({
      title: 'Small Shop',
      prompt: 'shop',
      sentences: [
        { chinese: '我去商店。', english: 'I go to the shop.' },
        { chinese: '商店很小。', english: 'The shop is small.' },
      ],
    }, 'shop')
    const validation = validateGeneratedStoryCoverage(story, [knownWord('我'), knownWord('去'), knownWord('商店'), knownWord('很'), knownWord('小')])
    const book = generatedStoryToReaderBook(story, validation, new Date('2026-01-01T00:00:00.000Z'))

    expect(book.packId).toBe('generated-stories')
    expect(book.stories[0].sentences).toHaveLength(2)
    expect(book.stories[0].sentences[0].english).toBe('I go to the shop.')
  })

  it('appends a continuation chapter with unique ids', () => {
    const vocab = [knownWord('我'), knownWord('去'), knownWord('商店'), knownWord('很'), knownWord('小')]
    const first = normalizeGeneratedStoryPayload({
      title: 'Small Shop',
      sentences: [
        { chinese: '我去商店。', english: 'I go to the shop.' },
        { chinese: '商店很小。', english: 'The shop is small.' },
      ],
    }, 'shop')
    const firstValidation = validateGeneratedStoryCoverage(first, vocab)
    const book = generatedStoryToReaderBook(first, firstValidation, new Date('2026-01-01T00:00:00.000Z'))

    const next = normalizeGeneratedStoryPayload({
      title: '第二章',
      sentences: [
        { chinese: '我很喜欢商店。', english: 'I really like the shop.' },
      ],
    }, '')
    const updated = appendGeneratedChapter(book, next, validateGeneratedStoryCoverage(next, vocab))

    expect(updated.stories).toHaveLength(2)
    expect(updated.chapterEnd).toBe(2)
    expect(updated.stories[1].chapter).toBe(2)
    // original untouched
    expect(book.stories).toHaveLength(1)
    // no id collisions across chapters
    const sentenceIds = updated.stories.flatMap((s) => s.sentences.map((x) => x.id))
    const audioIds = updated.stories.flatMap((s) => s.sentences.map((x) => x.audioClipId))
    expect(new Set(sentenceIds).size).toBe(sentenceIds.length)
    expect(new Set(audioIds).size).toBe(audioIds.length)
    // audio ids keep the deletable prefix
    expect(audioIds.every((id) => id.startsWith(`${book.id}:audio`))).toBe(true)
  })
})
