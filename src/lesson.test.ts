import { describe, expect, it } from 'vitest'
import { createPocketLesson, selectTargetWords } from './lesson'
import type { AudioClip, Sentence, VocabWord } from './types'

function makeWord(overrides: Partial<VocabWord> = {}): VocabWord {
  const now = new Date().toISOString()
  return {
    id: 'word:test',
    word: 'test',
    meaning: 'test meaning',
    status: 'new',
    audioWordId: 'audio:word-test',
    audioMeaningId: 'audio:meaning-test',
    seenCount: 0,
    correctCount: 0,
    wrongCount: 0,
    listenedSeconds: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function makeSentence(overrides: Partial<Sentence> = {}): Sentence {
  const now = new Date().toISOString()
  return {
    id: 'sentence:test',
    chinese: 'test sentence',
    english: 'test sentence meaning',
    targetWords: ['test'],
    audioSentenceId: 'audio:sentence-test',
    audioEnglishId: 'audio:sentence-meaning-test',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

const audioClips: AudioClip[] = []

describe('createPocketLesson', () => {
  it('keeps four words while replacing an explicitly excluded fifth word', () => {
    const words = Array.from({ length: 8 }, (_, index) => makeWord({
      id: `word:${index}`,
      word: `词${index}`,
      lessonNumber: index,
    }))
    const selected = selectTargetWords(words, [], {
      randomize: false,
      keptWordIds: words.slice(0, 4).map((word) => word.id),
      excludedWordIds: [words[4].id],
    })

    expect(selected.map((word) => word.id)).toEqual([
      'word:0', 'word:1', 'word:2', 'word:3', 'word:5',
    ])
  })

  it('includes linked English meaning clips in Words-mode steps', () => {
    const word = makeWord()
    const lesson = createPocketLesson([word], [], audioClips, [word.id], { randomize: false })

    expect(lesson.warnings).toEqual([])
    expect(
      lesson.steps.some(
        (step) =>
          step.kind === 'audio' &&
          step.audioId === 'audio:meaning-test' &&
          step.label === 'test meaning',
      ),
    ).toBe(true)
    expect(
      lesson.steps.some(
        (step) =>
          step.kind === 'audio' &&
          step.audioId === 'audio:word-test' &&
          step.label === 'test',
      ),
    ).toBe(true)
  })

  it('warns instead of silently skipping missing English meaning audio', () => {
    const word = makeWord({ audioMeaningId: undefined })
    const lesson = createPocketLesson([word], [], audioClips, [word.id], { randomize: false })

    expect(lesson.warnings).toContain('Missing English meaning audio for test: test meaning')
    expect(
      lesson.steps.some(
        (step) =>
          step.kind === 'audio' &&
          step.wordId === word.id &&
          step.label === 'test meaning',
      ),
    ).toBe(false)
    expect(lesson.steps.some((step) => step.kind === 'speech' && step.text === word.meaning)).toBe(true)
  })

  it('warns when sentence support is missing English audio', () => {
    const word = makeWord()
    const sentence = makeSentence({ audioEnglishId: undefined })
    const lesson = createPocketLesson([word], [sentence], audioClips, [word.id], {
      randomize: false,
    })

    expect(lesson.warnings).toContain(
      'Missing sentence English audio for test sentence: test sentence meaning',
    )
  })

  it('culminates in open-recall tiny sentences without two-choice recognition', () => {
    const word = makeWord()
    const sentence = makeSentence()
    const lesson = createPocketLesson([word], [sentence], audioClips, [word.id], {
      randomize: false,
    })

    expect(lesson.steps.some((step) => step.id.includes('guided-sentence') && step.label === 'Build it in Chinese')).toBe(true)
    expect(lesson.steps.some((step) => step.quiz?.kind === 'contrast')).toBe(false)
    expect(lesson.steps.filter((step) => step.sentenceId === sentence.id && step.kind === 'pause')).toHaveLength(2)
  })
})
