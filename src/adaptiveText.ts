import { pinyin } from 'pinyin-pro'
import { isFsrsCardDue, isNewFsrsCard } from './scheduler'
import type { ReaderWordToken, UserSettings, VocabWord } from './types'

export type AdaptivePinyinMode = UserSettings['readerPinyinMode']
export type AdaptivePinyinState = 'known' | 'medium' | 'unknown'

const READER_MAX_MATCH_LENGTH = 8

export function tokenizeReaderText(text: string, vocab: VocabWord[]): ReaderWordToken[] {
  const wordMap = new Map(vocab.map((word) => [word.word, word]))
  const maxWordLength = readerMaxChineseWordLength(wordMap)
  const segmenter =
    typeof Intl.Segmenter === 'function'
      ? new Intl.Segmenter('zh-CN', { granularity: 'word' })
      : undefined
  const tokens: ReaderWordToken[] = []
  let index = 0
  let tokenIndex = 0

  while (index < text.length) {
    if (!isChineseChar(text[index])) {
      const start = index
      while (index < text.length && !isChineseChar(text[index])) index += 1
      tokens.push({
        id: `token-${tokenIndex}`,
        text: text.slice(start, index),
        index: tokenIndex,
        isChinese: false,
      })
      tokenIndex += 1
      continue
    }

    const match = longestWordMatch(text, index, maxWordLength, wordMap)
    const segment = match?.text ?? firstChineseSegment(text.slice(index), segmenter)
    tokens.push({
      id: `token-${tokenIndex}`,
      text: segment,
      index: tokenIndex,
      isChinese: true,
      pinyin: match?.word.pinyin ?? pinyin(segment, { type: 'string', separator: ' ' }),
      word: match?.word,
    })
    index += segment.length
    tokenIndex += 1
  }

  return tokens.filter((token) => token.text.length > 0)
}

export function readerTokenClassName(
  token: ReaderWordToken,
  selectedToken: ReaderWordToken | null,
  pinyinMode: AdaptivePinyinMode,
): string {
  const state = readerPinyinState(token, pinyinMode)
  return [
    'reader-token',
    token.word ? 'saved-token' : '',
    selectedToken?.id === token.id ? 'active' : '',
    `pinyin-${state}`,
  ].filter(Boolean).join(' ')
}

export function readerShouldRenderPinyin(
  token: ReaderWordToken,
  pinyinMode: AdaptivePinyinMode,
): boolean {
  return readerPinyinState(token, pinyinMode) !== 'known'
}

export function readerPinyinState(
  token: ReaderWordToken,
  pinyinMode: AdaptivePinyinMode,
): AdaptivePinyinState {
  if (pinyinMode === 'all') return 'unknown'
  if (pinyinMode === 'none') return 'known'
  return adaptiveReaderPinyinState(token.word)
}

export function adaptiveReaderPinyinState(word?: VocabWord): AdaptivePinyinState {
  if (!word) return 'unknown'
  const interval = word.fsrsIntervalDays ?? 0
  const repetitions = word.fsrsRepetitions ?? 0
  const lapses = word.fsrsLapses ?? 0
  const due = isFsrsCardDue(word)

  if (word.fsrsState === 'Review' && interval >= 14 && !due && lapses === 0) return 'known'
  if (lapses > 0 && (due || interval < 14)) return 'unknown'
  if (word.fsrsState === 'Review' && interval >= 2) return 'medium'
  if (
    (word.fsrsState === 'Learning' || word.fsrsState === 'Relearning') &&
    repetitions > 0 &&
    !due
  ) {
    return 'medium'
  }
  return 'unknown'
}

export function readerMaxChineseWordLength(wordMap: Map<string, VocabWord>): number {
  let maxLength = 1
  for (const word of wordMap.keys()) {
    if (!/[\u3400-\u9fff]/u.test(word)) continue
    maxLength = Math.max(maxLength, Math.min(word.length, READER_MAX_MATCH_LENGTH))
  }
  return maxLength
}

export function collectReaderComprehensionTokens(
  text: string,
  wordMap: Map<string, VocabWord>,
  maxWordLength: number,
): Array<{ text: string; word?: VocabWord }> {
  const tokens: Array<{ text: string; word?: VocabWord }> = []
  let index = 0
  while (index < text.length) {
    if (!isChineseChar(text[index])) {
      index += 1
      continue
    }
    const match = longestWordMatch(text, index, maxWordLength, wordMap)
    if (match) {
      tokens.push(match)
      index += match.text.length
    } else {
      tokens.push({ text: text[index] })
      index += 1
    }
  }
  return tokens
}

export function readerComprehensionCategory(word?: VocabWord): 'known' | 'learning' | 'new' {
  if (!word || isNewFsrsCard(word)) return 'new'
  const interval = word.fsrsIntervalDays ?? 0
  if (word.fsrsState === 'Review' && interval >= 14 && !isFsrsCardDue(word)) return 'known'
  return 'learning'
}

export function isChineseChar(char: string): boolean {
  return /[\u3400-\u9fff]/u.test(char)
}

export function longestWordMatch(
  text: string,
  start: number,
  maxWordLength: number,
  wordMap: Map<string, VocabWord>,
): { text: string; word: VocabWord } | undefined {
  for (let length = Math.min(maxWordLength, text.length - start); length > 0; length -= 1) {
    const candidate = text.slice(start, start + length)
    const word = wordMap.get(candidate)
    if (word) return { text: candidate, word }
  }
  return undefined
}

export function firstChineseSegment(text: string, segmenter?: Intl.Segmenter): string {
  const segment = segmenter ? Array.from(segmenter.segment(text))[0]?.segment : undefined
  if (segment && isChineseChar(segment[0])) return segment
  return text[0] ?? ''
}
