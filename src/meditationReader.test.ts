import { describe, expect, it } from 'vitest'
import { MEDITATION_PASSAGES } from './meditations'
import { MEDITATIVE_SCRIPTURE_BOOK, readLegacyMeditationProgress } from './meditationReader'

describe('Meditative Scripture reader book', () => {
  it('converts every passage and movement into contextual interlinear reader content', () => {
    expect(MEDITATIVE_SCRIPTURE_BOOK.stories).toHaveLength(8)
    expect(MEDITATIVE_SCRIPTURE_BOOK.stories.map((story) => story.title)).toEqual(
      MEDITATION_PASSAGES.map((passage) => `${passage.title} · ${passage.chineseTitle}`),
    )
    const sourceUnits = MEDITATION_PASSAGES.flatMap((passage) => passage.units)
    const sentences = MEDITATIVE_SCRIPTURE_BOOK.stories.flatMap((story) => story.sentences)
    expect(sentences).toHaveLength(sourceUnits.length)
    expect(sentences.every((sentence) => sentence.interlinear?.every((chunk) => chunk.pinyin && chunk.gloss))).toBe(true)
  })

  it('maps legacy passage progress into the flattened reader position', () => {
    const values = new Map<string, string>()
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
      },
    })
    localStorage.setItem('chunky-meditate-progress-v1', JSON.stringify({ passageId: 'psalm-1', unitIndex: 2 }))
    expect(readLegacyMeditationProgress()).toBe(MEDITATION_PASSAGES[0].units.length + 2)
  })
})
