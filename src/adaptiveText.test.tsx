import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AdaptiveChineseText } from './AdaptiveChineseText'
import {
  adaptiveReaderPinyinState,
  firstChineseSegment,
  longestWordMatch,
  tokenizeReaderText,
} from './adaptiveText'
import type { VocabWord } from './types'

describe('adaptive text helpers', () => {
  it('prefers saved multi-character vocabulary over fallback segmentation', () => {
    const word = makeWord('照顾', { pinyin: 'zhao gu' })
    const tokens = tokenizeReaderText('我要照顾家人。', [word])

    expect(tokens.some((token) => token.text === '照顾' && token.word?.id === word.id)).toBe(true)
  })

  it('exposes pure longest-match and first-segment helpers', () => {
    const word = makeWord('雕刻工具')
    const wordMap = new Map([[word.word, word]])

    expect(longestWordMatch('雕刻工具到了', 0, 8, wordMap)?.text).toBe('雕刻工具')
    expect(firstChineseSegment('我来了')).toBe('我')
  })

  it('classifies known, medium, and unknown FSRS pinyin states', () => {
    expect(
      adaptiveReaderPinyinState(
        makeWord('钱', {
          fsrsState: 'Review',
          fsrsIntervalDays: 20,
          fsrsDueAt: '2099-01-01T00:00:00.000Z',
          fsrsRepetitions: 4,
        }),
      ),
    ).toBe('known')

    expect(
      adaptiveReaderPinyinState(
        makeWord('工坊', {
          fsrsState: 'Review',
          fsrsIntervalDays: 3,
          fsrsDueAt: '2099-01-01T00:00:00.000Z',
          fsrsRepetitions: 2,
        }),
      ),
    ).toBe('medium')

    expect(adaptiveReaderPinyinState(undefined)).toBe('unknown')
  })

  it('renders the same ruby visibility states Reader relies on', () => {
    const known = makeWord('钱', {
      pinyin: 'qian',
      fsrsState: 'Review',
      fsrsIntervalDays: 20,
      fsrsDueAt: '2099-01-01T00:00:00.000Z',
      fsrsRepetitions: 4,
    })
    const medium = makeWord('工坊', {
      pinyin: 'gong fang',
      fsrsState: 'Review',
      fsrsIntervalDays: 3,
      fsrsDueAt: '2099-01-01T00:00:00.000Z',
      fsrsRepetitions: 2,
    })
    const markup = renderToStaticMarkup(
      <AdaptiveChineseText
        tokens={[
          { id: 'known', text: '钱', index: 0, isChinese: true, pinyin: 'qian', word: known },
          { id: 'space', text: ' ', index: 1, isChinese: false },
          { id: 'medium', text: '工坊', index: 2, isChinese: true, pinyin: 'gong fang', word: medium },
          { id: 'unknown', text: '新', index: 3, isChinese: true, pinyin: 'xin' },
        ]}
        selectedToken={null}
        pinyinMode="adaptive"
        onSelectToken={() => undefined}
      />,
    )

    expect(markup).toContain('pinyin-known')
    expect(markup).toContain('pinyin-medium')
    expect(markup).toContain('pinyin-unknown')
    expect(markup).not.toContain('<rt>qian</rt>')
    expect(markup).toContain('<rt>gong fang</rt>')
    expect(markup).toContain('<rt>xin</rt>')
  })
})

function makeWord(word: string, patch: Partial<VocabWord> = {}): VocabWord {
  return {
    id: `word:${word}`,
    word,
    meaning: word,
    status: 'learning',
    seenCount: 0,
    correctCount: 0,
    wrongCount: 0,
    listenedSeconds: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...patch,
  }
}
