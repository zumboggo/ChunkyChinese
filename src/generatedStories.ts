import { pinyin } from 'pinyin-pro'
import {
  collectReaderComprehensionTokens,
  readerComprehensionCategory,
  readerMaxChineseWordLength,
} from './adaptiveText'
import { stableHash } from './csv'
import type { ReaderBook, ReaderSentence, VocabWord } from './types'

export const GENERATED_STORIES_PACK_ID = 'generated-stories'
export const GENERATED_STORIES_PACK_NAME = 'Generated Stories'
export const GENERATED_STORY_TARGET_COVERAGE = 95

export interface GeneratedStorySentence {
  chinese: string
  english: string
}

export interface GeneratedStoryNewWord {
  word: string
  pinyin?: string
  meaning: string
}

export interface GeneratedStoryPayload {
  title: string
  prompt: string
  estimatedLevel?: string
  knownCoverageEstimate?: number
  sentences: GeneratedStorySentence[]
  unavoidableNewWords?: GeneratedStoryNewWord[]
}

export interface GeneratedStoryValidation {
  knownCoveragePercent: number
  knownOccurrences: number
  totalOccurrences: number
  unavoidableNewWords: GeneratedStoryNewWord[]
  warning?: string
}

export function validateGeneratedStoryCoverage(
  story: GeneratedStoryPayload,
  vocab: VocabWord[],
  // Focus words the prompt deliberately wove in: they are the learner's own
  // almost-known vocab, so they count as known for the coverage bar rather
  // than tripping the "too hard" retry.
  treatAsKnown?: Set<string>,
): GeneratedStoryValidation {
  const wordMap = new Map(vocab.map((word) => [word.word, word]))
  const maxWordLength = readerMaxChineseWordLength(wordMap)
  let knownOccurrences = 0
  let totalOccurrences = 0

  for (const sentence of story.sentences) {
    const tokens = collectReaderComprehensionTokens(sentence.chinese, wordMap, maxWordLength)
    for (const token of tokens) {
      totalOccurrences += 1
      if (
        readerComprehensionCategory(token.word) === 'known' ||
        (token.word && treatAsKnown?.has(token.text))
      ) {
        knownOccurrences += 1
      }
    }
  }

  const knownCoveragePercent =
    totalOccurrences > 0 ? Math.round((knownOccurrences / totalOccurrences) * 100) : 0
  const unavoidableNewWords = story.unavoidableNewWords ?? []
  const warnings: string[] = []
  if (knownCoveragePercent < GENERATED_STORY_TARGET_COVERAGE) {
    warnings.push(`${knownCoveragePercent}% known-word coverage`)
  }
  if (unavoidableNewWords.length > 5) {
    warnings.push(`${unavoidableNewWords.length} new words`)
  }

  return {
    knownCoveragePercent,
    knownOccurrences,
    totalOccurrences,
    unavoidableNewWords,
    warning: warnings.length > 0 ? `Generated story may be harder than requested: ${warnings.join(', ')}.` : undefined,
  }
}

function buildGeneratedSentences(
  storyId: string,
  sentences: GeneratedStorySentence[],
  idFor: (n: number) => string,
  audioIdFor: (n: number) => string,
): ReaderSentence[] {
  return sentences.map((sentence, index) => ({
    id: idFor(index + 1),
    storyId,
    index: index + 1,
    chinese: sentence.chinese.trim(),
    pinyin: pinyin(sentence.chinese.trim(), { type: 'string', separator: ' ' }),
    english: sentence.english.trim(),
    targetWords: [],
    audioClipId: audioIdFor(index + 1),
    audioFilename: '',
    ssmlFilename: '',
  }))
}

export function generatedStoryToReaderBook(
  story: GeneratedStoryPayload,
  validation: GeneratedStoryValidation,
  now = new Date(),
): ReaderBook {
  const createdAt = now.toISOString()
  const bookId = `generated-story:${stableHash(`${createdAt}|${story.title}|${story.prompt}`)}`
  const storyId = `${bookId}:story`
  const sentences = buildGeneratedSentences(
    storyId,
    story.sentences,
    (n) => `${bookId}:sentence:${n}`,
    (n) => `${bookId}:audio:${n}`,
  )

  return {
    id: bookId,
    packId: GENERATED_STORIES_PACK_ID,
    title: story.title.trim() || 'Generated Story',
    book: 0,
    chapterStart: 1,
    chapterEnd: 1,
    stories: [
      {
        id: storyId,
        title: story.title.trim() || 'Generated Story',
        book: 0,
        chapter: 1,
        sourceInspiration: `Prompt: ${story.prompt}. Coverage: ${validation.knownCoveragePercent}%.`,
        newWords: validation.unavoidableNewWords.map((word) => ({
          word: word.word,
          pinyin: word.pinyin,
          meaning: word.meaning,
        })),
        sentences,
      },
    ],
  }
}

/**
 * Appends a generated continuation as a new chapter of an existing book.
 * The `c${chapter}` id prefix cannot collide with chapter 1's plain-number
 * scheme, and audio ids still start with `${bookId}:audio` so prefix-based
 * clip deletion covers every chapter.
 */
export function appendGeneratedChapter(
  book: ReaderBook,
  story: GeneratedStoryPayload,
  validation: GeneratedStoryValidation,
): ReaderBook {
  const chapter = book.stories.length + 1
  const storyId = `${book.id}:story:c${chapter}`
  const sentences = buildGeneratedSentences(
    storyId,
    story.sentences,
    (n) => `${book.id}:sentence:c${chapter}-${n}`,
    (n) => `${book.id}:audio:c${chapter}-${n}`,
  )
  const newStory = {
    id: storyId,
    title: story.title.trim() || `Chapter ${chapter}`,
    book: book.book,
    chapter,
    sourceInspiration: `Prompt: ${story.prompt}. Coverage: ${validation.knownCoveragePercent}%.`,
    newWords: validation.unavoidableNewWords.map((word) => ({
      word: word.word,
      pinyin: word.pinyin,
      meaning: word.meaning,
    })),
    sentences,
  }
  return {
    ...book,
    chapterEnd: chapter,
    stories: [...book.stories, newStory],
  }
}

export function normalizeGeneratedStoryPayload(value: unknown, fallbackPrompt: string): GeneratedStoryPayload {
  if (!value || typeof value !== 'object') throw new Error('Generated story response was empty.')
  const raw = value as Record<string, unknown>
  const rawSentences = Array.isArray(raw.sentences) ? raw.sentences : []
  const sentences = rawSentences
    .map((item): GeneratedStorySentence | null => {
      if (!item || typeof item !== 'object') return null
      const row = item as Record<string, unknown>
      const chinese = typeof row.chinese === 'string' ? row.chinese.trim() : ''
      const english = typeof row.english === 'string' ? row.english.trim() : ''
      return chinese && english ? { chinese, english } : null
    })
    .filter((item): item is GeneratedStorySentence => Boolean(item))

  if (sentences.length === 0) throw new Error('Generated story did not include bilingual sentences.')

  return {
    title: typeof raw.title === 'string' ? raw.title.trim() : 'Generated Story',
    prompt: typeof raw.prompt === 'string' ? raw.prompt.trim() : fallbackPrompt,
    estimatedLevel: typeof raw.estimatedLevel === 'string' ? raw.estimatedLevel : undefined,
    knownCoverageEstimate:
      typeof raw.knownCoverageEstimate === 'number' ? raw.knownCoverageEstimate : undefined,
    sentences,
    unavoidableNewWords: normalizeNewWords(raw.unavoidableNewWords),
  }
}

function normalizeNewWords(value: unknown): GeneratedStoryNewWord[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item): GeneratedStoryNewWord | null => {
      if (!item || typeof item !== 'object') return null
      const row = item as Record<string, unknown>
      const word = typeof row.word === 'string' ? row.word.trim() : ''
      const meaning = typeof row.meaning === 'string' ? row.meaning.trim() : ''
      if (!word || !meaning) return null
      return {
        word,
        meaning,
        pinyin: typeof row.pinyin === 'string' ? row.pinyin.trim() : undefined,
      }
    })
    .filter((item): item is GeneratedStoryNewWord => Boolean(item))
}
