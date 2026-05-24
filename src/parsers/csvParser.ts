import { makeSentenceId, makeWordId, parseCsv } from '../csv'
import type { ParsedContent, ContentParser } from './types'

export interface CsvMapping {
  wordCol?: string
  meaningCol?: string
  pinyinCol?: string
  chineseCol?: string
  englishCol?: string
}

export class CsvParser implements ContentParser {
  name = 'CSV Parser'
  accepts = ['.csv']

  async parse(fileContent: string, options?: { mapping?: CsvMapping }): Promise<ParsedContent> {
    const rows = parseCsv(fileContent)
    const mapping = options?.mapping ?? this.guessMapping(rows[0] || {})
    
    const parsedWords = []
    const parsedSentences = []

    for (const row of rows) {
      if (mapping.wordCol && row[mapping.wordCol]) {
        const word = row[mapping.wordCol]
        parsedWords.push({
          id: makeWordId(word),
          word,
          meaning: mapping.meaningCol ? row[mapping.meaningCol] : '',
          pinyin: mapping.pinyinCol ? row[mapping.pinyinCol] : '',
          status: 'new' as const,
        })
      }

      if (mapping.chineseCol && row[mapping.chineseCol]) {
        const chinese = row[mapping.chineseCol]
        const english = mapping.englishCol ? row[mapping.englishCol] : ''
        parsedSentences.push({
          id: makeSentenceId(chinese, english),
          chinese,
          english,
        })
      }
    }

    return {
      words: parsedWords,
      sentences: parsedSentences,
    }
  }

  private guessMapping(firstRow: Record<string, string>): CsvMapping {
    const keys = Object.keys(firstRow).map(k => k.toLowerCase())
    
    const findKey = (possibleNames: string[]) => {
      const lowerNames = possibleNames.map(n => n.toLowerCase())
      const match = keys.find(k => lowerNames.includes(k))
      return match ? Object.keys(firstRow).find(k => k.toLowerCase() === match) : undefined
    }

    return {
      wordCol: findKey(['word', 'hanzi', 'front', 'chinese']),
      meaningCol: findKey(['meaning', 'english', 'back', 'definition']),
      pinyinCol: findKey(['pinyin']),
      chineseCol: findKey(['sentence', 'chinesesentence', 'chinese']),
      englishCol: findKey(['sentenceenglish', 'englishsentence', 'english', 'meaning']),
    }
  }
}
