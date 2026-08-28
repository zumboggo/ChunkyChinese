import { describe, expect, it } from 'vitest'
import { MEDITATION_PASSAGES } from './meditations'

describe('meditation passages', () => {
  it('contains every requested passage', () => {
    expect(MEDITATION_PASSAGES.map((passage) => passage.id)).toEqual([
      'psalm-23',
      'psalm-1',
      'john-15',
      'colossians',
      'ephesians-1',
      'ephesians-2',
      'galatians-5',
      'luke-15-prodigal',
    ])
  })

  it('gives every meditation unit Chinese phrases, contextual glosses, and natural English', () => {
    for (const passage of MEDITATION_PASSAGES) {
      expect(passage.units.length).toBeGreaterThan(0)
      for (const unit of passage.units) {
        expect(unit.reference).not.toBe('')
        expect(unit.english.length).toBeGreaterThan(20)
        expect(unit.phrases.length).toBeGreaterThan(2)
        expect(unit.phrases.every((phrase) => phrase.chinese && phrase.gloss)).toBe(true)
      }
    }
  })
})
