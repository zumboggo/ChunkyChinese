import { pinyin } from 'pinyin-pro'
import { MEDITATION_PASSAGES, MEDITATION_SOURCE_NOTE } from './meditations'
import type { ReaderBook } from './types'

export const MEDITATIVE_SCRIPTURE_BOOK_ID = 'builtin:meditative-scripture'

export const MEDITATIVE_SCRIPTURE_BOOK: ReaderBook = {
  id: MEDITATIVE_SCRIPTURE_BOOK_ID,
  packId: 'builtin:scripture',
  title: 'Meditative Scripture · 默想经文',
  book: 0,
  chapterStart: 1,
  chapterEnd: MEDITATION_PASSAGES.length,
  stories: MEDITATION_PASSAGES.map((passage, chapterIndex) => ({
    id: `scripture:${passage.id}`,
    title: `${passage.title} · ${passage.chineseTitle}`,
    book: 0,
    chapter: chapterIndex + 1,
    sourceInspiration: `${passage.subtitle} · ${passage.theme}. ${MEDITATION_SOURCE_NOTE}`,
    newWords: [],
    sentences: passage.units.map((unit, index) => {
      const chinese = unit.phrases.map((phrase) => phrase.chinese).join('')
      return {
        id: `scripture:${passage.id}:${index}`,
        storyId: `scripture:${passage.id}`,
        index,
        chinese,
        pinyin: pinyin(chinese, { type: 'string', separator: ' ' }),
        english: unit.english,
        targetWords: unit.phrases.map((phrase) => phrase.chinese),
        audioClipId: `scripture-audio:${passage.id}:${index}`,
        audioFilename: '',
        ssmlFilename: '',
        interlinear: unit.phrases.map((phrase) => ({
          chinese: phrase.chinese,
          pinyin: pinyin(phrase.chinese, { type: 'string', separator: ' ' }),
          gloss: phrase.gloss,
        })),
      }
    }),
  })),
}

export function includeMeditativeScripture(books: ReaderBook[]): ReaderBook[] {
  return [MEDITATIVE_SCRIPTURE_BOOK, ...books.filter((book) => book.id !== MEDITATIVE_SCRIPTURE_BOOK_ID)]
}

export function readLegacyMeditationProgress(): number | undefined {
  try {
    const raw = localStorage.getItem('chunky-meditate-progress-v1')
    if (!raw) return
    const value = JSON.parse(raw) as { passageId?: string; unitIndex?: number }
    const passageIndex = MEDITATION_PASSAGES.findIndex((passage) => passage.id === value.passageId)
    if (passageIndex < 0 || !Number.isInteger(value.unitIndex)) return
    const preceding = MEDITATION_PASSAGES.slice(0, passageIndex)
      .reduce((sum, passage) => sum + passage.units.length, 0)
    return preceding + Math.max(0, value.unitIndex ?? 0)
  } catch {
    return
  }
}

export function clearLegacyMeditationProgress(): void {
  localStorage.removeItem('chunky-meditate-progress-v1')
}
