import { describe, expect, it } from 'vitest'
import { parseBilingualReaderText, titleFromTextFilename } from './readerTextImport'

describe('paired-line Reader text import', () => {
  it('turns alternating Chinese and English lines into Reader sentences', () => {
    const story = parseBilingualReaderText('今天天气很好。\nThe weather is lovely today.\n\n我们去公园。\nWe go to the park.\n', 'A Walk.txt')
    expect(story.title).toBe('A Walk')
    expect(story.sentences).toEqual([
      { chinese: '今天天气很好。', english: 'The weather is lovely today.' },
      { chinese: '我们去公园。', english: 'We go to the park.' },
    ])
  })

  it('explains an unmatched line', () => {
    expect(() => parseBilingualReaderText('你好。\nHello.\n再见。')).toThrow(/no matching English/i)
  })

  it('rejects reversed pairs and missing translations before saving', () => {
    expect(() => parseBilingualReaderText('Hello.\n你好。')).toThrow(/Line 1 should be Chinese/)
    expect(() => parseBilingualReaderText('你好。\n再见。')).toThrow(/Line 2 should be an English/)
  })

  it('derives a readable title from the filename', () => {
    expect(titleFromTextFilename('My Story.TXT')).toBe('My Story')
  })
})
