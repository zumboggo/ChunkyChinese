import type { Sentence, VocabWord } from '../types'

export interface ParsedContent {
  words: Partial<VocabWord>[]
  sentences: Partial<Sentence>[]
  rawText?: string
}

export interface ContentParser {
  name: string
  accepts: string[] // e.g. ['.csv', '.txt']
  parse(fileContent: string, options?: any): Promise<ParsedContent>
}
