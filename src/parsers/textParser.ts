import { makeSentenceId, stableHash } from '../csv'
import type { ParsedContent, ContentParser } from './types'
import { pinyin as pinyinPro } from 'pinyin-pro'
import { lookupDictionary } from '../db'

export class TextParser implements ContentParser {
  name = 'Text Parser'
  accepts = ['.txt']

  async parse(fileContent: string): Promise<ParsedContent> {
    const sentences = this.chunkIntoSentences(fileContent)
    const parsedSentences = []
    const parsedWords = new Map<string, any>()

    for (const chinese of sentences) {
      if (!chinese.trim()) continue
      
      const sentenceId = makeSentenceId(chinese, '') // No english translation by default
      parsedSentences.push({
        id: sentenceId,
        chinese,
        english: '', // To be filled by user or dictionary
      })

      const tokens = this.segmentWords(chinese)
      for (const token of tokens) {
        if (token.isChinese && token.text.trim()) {
          const word = token.text
          if (!parsedWords.has(word)) {
            parsedWords.set(word, {
              id: `word:${word}`,
              word,
              pinyin: '',
              meaning: '',
              status: 'new',
            })
          }
        }
      }
    }

    const uniqueWords = Array.from(parsedWords.values())
    await Promise.all(uniqueWords.map(async (wordObj) => {
      try {
        const dictEntry = await lookupDictionary(wordObj.word!)
        if (dictEntry) {
          wordObj.meaning = dictEntry.english
          wordObj.pinyin = dictEntry.pinyin
        } else {
          wordObj.pinyin = pinyinPro(wordObj.word!, { toneType: 'num' })
        }
      } catch {
        wordObj.pinyin = pinyinPro(wordObj.word!, { toneType: 'num' })
      }
    }))

    return {
      words: Array.from(parsedWords.values()),
      sentences: parsedSentences,
      rawText: fileContent
    }
  }

  private chunkIntoSentences(text: string): string[] {
    // Basic splitting by common Chinese punctuation
    return text.split(/([。！？\n\r]+)/).reduce((acc, part, i, arr) => {
      if (i % 2 === 0) {
        const punctuation = arr[i + 1] || ''
        const sentence = (part + punctuation).trim()
        if (sentence) acc.push(sentence)
      }
      return acc
    }, [] as string[])
  }

  private segmentWords(text: string) {
    if (!('Segmenter' in Intl)) {
       // Fallback to characters if segmenter is not available (though it is in modern browsers)
       return Array.from(text).map(char => ({ text: char, isChinese: /[\u4e00-\u9fa5]/.test(char) }))
    }
    const segmenter = new Intl.Segmenter('zh-CN', { granularity: 'word' })
    const segments = Array.from(segmenter.segment(text))
    return segments.map(seg => ({
      text: seg.segment,
      isChinese: /[\u4e00-\u9fa5]+/.test(seg.segment)
    }))
  }
}
