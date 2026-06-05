import { describe, it, expect } from 'vitest'
import { buildDict, tokenize, matchWord, isChineseChar } from './vn-analyze-language.mjs'

describe('vn-analyze-language', () => {
  describe('buildDict', () => {
    it('builds a dictionary map from snapshot', () => {
      const snapshot = {
        words: {
          strong: ['好', '是'],
          medium: ['我们'],
          learning: ['魔法']
        }
      }
      const dict = buildDict(snapshot)
      expect(dict.get('好')).toBe('known')
      expect(dict.get('是')).toBe('known')
      expect(dict.get('我们')).toBe('medium')
      expect(dict.get('魔法')).toBe('unknown')
      expect(dict.has('不在')).toBe(false)
    })
  })

  describe('isChineseChar', () => {
    it('identifies chinese characters correctly', () => {
      expect(isChineseChar('好')).toBe(true)
      expect(isChineseChar('，')).toBe(false)
      expect(isChineseChar('A')).toBe(false)
      expect(isChineseChar('。')).toBe(false)
    })
  })

  describe('matchWord', () => {
    it('finds longest match', () => {
      const dict = new Map([
        ['我们', 'known'],
        ['我', 'known']
      ])
      const match = matchWord('我们好', 0, dict)
      expect(match).toBe('我们')
    })
    
    it('returns null if no match', () => {
      const dict = new Map()
      expect(matchWord('我们好', 0, dict)).toBe(null)
    })
  })

  describe('tokenize', () => {
    it('tokenizes correctly mixing known and unknown', () => {
      const dict = new Map([
        ['他', 'known'],
        ['是', 'known'],
        ['一个', 'medium']
      ])
      // "他是一个好人" -> 他(known), 是(known), 一个(medium), 好(unknown), 人(unknown)
      const text = '他是一个好人'
      const tokens = tokenize(text, dict)
      expect(tokens).toEqual([
        { text: '他', category: 'known' },
        { text: '是', category: 'known' },
        { text: '一个', category: 'medium' },
        { text: '好', category: 'unknown' },
        { text: '人', category: 'unknown' }
      ])
    })

    it('skips non-chinese characters but preserves their spacing conceptually', () => {
      const dict = new Map([
        ['我', 'known']
      ])
      // "我，我" -> 我(known), 我(known)
      const tokens = tokenize('我，我', dict)
      expect(tokens).toEqual([
        { text: '我', category: 'known' },
        { text: '我', category: 'known' }
      ])
    })
  })
})
