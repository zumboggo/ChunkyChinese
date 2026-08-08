import { describe, expect, it } from 'vitest'
import {
  buildSentenceSessionSteps,
  filterPoolSentences,
  getSentencePool,
  selectSequentialSentences,
  sentenceClipId,
  sentenceSeedAudioUrl,
  SENTENCE_POOLS,
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

describe('sentence pools', () => {
  it('falls back to the LMS pool for unknown or missing ids, keeping legacy clip ids', () => {
    expect(getSentencePool(undefined).id).toBe('lms-1000')
    expect(getSentencePool('nope').id).toBe('lms-1000')
    expect(sentenceClipId('一样', 'zh')).toBe('lms-sentence-一样')
    expect(sentenceSeedAudioUrl('一样', 'en')).toBe(
      `seed/sentence-audio/${encodeURIComponent('一样-en.mp3')}`,
    )
  })

  it('namespaces clip ids and audio paths per pool', () => {
    const pool = getSentencePool('china-taxi')
    expect(sentenceClipId('cl-taxi-001', 'zh', pool)).toBe('china-life-sentence-cl-taxi-001')
    expect(sentenceSeedAudioUrl('cl-taxi-001', 'en', pool)).toBe(
      'seed/china-life-audio/cl-taxi-001-en.mp3',
    )
  })

  it('gives every topic pool of one seed file the same audio, so clips are shared', () => {
    const chinaPools = SENTENCE_POOLS.filter((pool) => pool.id.startsWith('china-'))
    expect(chinaPools.length).toBeGreaterThan(1)
    for (const pool of chinaPools) {
      expect(pool.audioDir).toBe('seed/china-life-audio')
      expect(pool.clipPrefix).toBe('china-life-sentence')
    }
  })

  it('filters a seed file down to a topic, and leaves untopiced pools whole', () => {
    const seed = [
      { word: 'a', topic: 'taxi' },
      { word: 'b', topic: 'school' },
      { word: 'c', topic: 'taxi' },
    ]
    expect(filterPoolSentences(seed, getSentencePool('china-taxi')).map((s) => s.word))
      .toEqual(['a', 'c'])
    expect(filterPoolSentences(seed, getSentencePool('china-life'))).toHaveLength(3)
  })

  it('builds session steps against the pool named in the settings', () => {
    const steps = buildSentenceSessionSteps(
      [{ word: 'cl-taxi-001', chinese: '师傅，去人民广场。', english: 'Driver, to People\u2019s Square.' }],
      { ...BASE_SETTINGS, sentencePoolId: 'china-taxi', sentenceRepeats: 1, sentenceRounds: 1 },
    )
    expect(steps.filter((s) => s.kind === 'clip').map((s) => s.clipId)).toEqual([
      'china-life-sentence-cl-taxi-001-en',
      'china-life-sentence-cl-taxi-001',
    ])
  })
})
