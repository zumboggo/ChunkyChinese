import { describe, expect, it } from 'vitest'
import {
  buildSentenceSessionSteps,
  selectSequentialSentences,
  sentenceClipId,
  type SentenceListeningSettings,
} from './sentenceListening'

const SENTENCES = [
  { word: '一样', chinese: '他们长得一样。', english: 'They look the same.' },
  { word: '一次', chinese: '我去过一次北京。', english: 'I have been to Beijing once.' },
  { word: '一生', chinese: '他一生都住在这里。', english: 'He lived here his whole life.' },
]

const BASE_SETTINGS: SentenceListeningSettings = {
  sentenceRepeats: 2,
  sentenceIncludeEnglish: true,
  sentencePauseFactor: 1,
  sentenceSessionSize: 5,
  sentenceRounds: 2,
  sentenceShuffle: false,
}

describe('buildSentenceSessionSteps', () => {
  it('produces English → pause → Chinese ×repeats with shadowing pauses per rep', () => {
    const steps = buildSentenceSessionSteps([SENTENCES[0]], {
      ...BASE_SETTINGS,
      sentenceRounds: 1,
    })
    expect(steps.map((s) => `${s.kind}:${s.clipId ?? s.label}`)).toEqual([
      `clip:${sentenceClipId('一样', 'en')}`,
      'pause:Recall pause',
      `clip:${sentenceClipId('一样', 'zh')}`,
      'pause:Shadowing pause',
      `clip:${sentenceClipId('一样', 'zh')}`,
      'pause:Shadowing pause',
      'pause:Sentence gap',
    ])
  })

  it('skips English audio and shadowing pauses when disabled', () => {
    const steps = buildSentenceSessionSteps([SENTENCES[0]], {
      ...BASE_SETTINGS,
      sentenceIncludeEnglish: false,
      sentencePauseFactor: 0,
      sentenceRepeats: 1,
      sentenceRounds: 1,
    })
    expect(steps.map((s) => s.kind)).toEqual(['clip', 'pause'])
    expect(steps[0].clipId).toBe(sentenceClipId('一样', 'zh'))
  })

  it('covers every sentence once per round with correct round tags', () => {
    const steps = buildSentenceSessionSteps(SENTENCES, BASE_SETTINGS)
    for (let round = 0; round < BASE_SETTINGS.sentenceRounds; round += 1) {
      const roundSteps = steps.filter((s) => s.round === round)
      const sentenceIndexes = new Set(roundSteps.map((s) => s.sentenceIndex))
      expect(sentenceIndexes).toEqual(new Set([0, 1, 2]))
    }
  })

  it('keeps a fixed order without shuffle and shuffles per round with it', () => {
    const fixed = buildSentenceSessionSteps(SENTENCES, BASE_SETTINGS)
    const fixedOrder = fixed
      .filter((s) => s.round === 0 && s.kind === 'clip' && s.clipId?.endsWith('-en'))
      .map((s) => s.sentenceIndex)
    expect(fixedOrder).toEqual([0, 1, 2])

    const reversed = buildSentenceSessionSteps(
      SENTENCES,
      { ...BASE_SETTINGS, sentenceShuffle: true, sentenceRounds: 1 },
      () => 0, // deterministic: Fisher–Yates with random()=0 rotates the order
    )
    const shuffledOrder = reversed
      .filter((s) => s.kind === 'clip' && s.clipId?.endsWith('-en'))
      .map((s) => s.sentenceIndex)
    expect(shuffledOrder).not.toEqual([0, 1, 2])
    expect(new Set(shuffledOrder)).toEqual(new Set([0, 1, 2]))
  })

  it('shadowing pause factor is attached relative to the previous clip', () => {
    const steps = buildSentenceSessionSteps([SENTENCES[0]], {
      ...BASE_SETTINGS,
      sentencePauseFactor: 1.5,
      sentenceRepeats: 1,
      sentenceRounds: 1,
    })
    const shadow = steps.find((s) => s.label === 'Shadowing pause')
    expect(shadow?.factorOfPrevious).toBe(1.5)
    expect(shadow?.seconds).toBeUndefined()
  })
})

describe('selectSequentialSentences', () => {
  it('selects sequentially from the offset and wraps around the pool', () => {
    expect(selectSequentialSentences(SENTENCES, 2, 0).map((s) => s.word)).toEqual(['一样', '一次'])
    expect(selectSequentialSentences(SENTENCES, 2, 2).map((s) => s.word)).toEqual(['一生', '一样'])
    expect(selectSequentialSentences(SENTENCES, 2, 5).map((s) => s.word)).toEqual(['一生', '一样'])
  })

  it('caps the set at the pool size and handles an empty pool', () => {
    expect(selectSequentialSentences(SENTENCES, 10, 0)).toHaveLength(3)
    expect(selectSequentialSentences([], 5, 0)).toEqual([])
  })
})
