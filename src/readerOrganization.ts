import type { ReaderBook } from './types'

export interface ReaderPlacement {
  textLength: 'short' | 'long'
  category: string
  temporary: boolean
}
export const DEFAULT_READER_CATEGORIES = ['General', 'Harry Potter · The Boy Who Lived', 'Legendary Moonlight Sculptor', '勿扰飞升', 'School', 'Deliveries', 'Everyday life', 'Scripture']
export function normalizeReaderCategory(value: string): string {
  const category = value.trim().replace(/\s+/g, ' ')
  if (/^(lms|legendary moonlight sculptor)$/i.test(category)) return 'Legendary Moonlight Sculptor'
  if (/^(harry potter|the boy who lived|boy who lived|harry potter · the boy who lived)$/i.test(category)) return 'Harry Potter · The Boy Who Lived'
  return DEFAULT_READER_CATEGORIES.find(item => item.toLowerCase() === category.toLowerCase()) ?? (category || 'General')
}
export function readerPlacement(book: ReaderBook): ReaderPlacement {
  const categories: Record<string, string> = {
    'lms-books': 'Legendary Moonlight Sculptor', 'harry-potter-graded': 'Harry Potter · The Boy Who Lived',
    'wurao-feisheng-graded': '勿扰飞升', 'sherlock-holmes': 'Sherlock Holmes',
    'rise-of-the-monkey-king': 'Rise of the Monkey King', 'just-friends': 'Just Friends?',
    'can-i-dance': 'Can I Dance With You?', 'china-arrival': 'Everyday life', 'john-gospel': 'Scripture',
  }
  return {
    textLength: book.library?.textLength ?? (book.packId === 'generated-stories' && book.stories.length === 1 && book.stories[0].sentences.length < 80 ? 'short' : 'long'),
    category: normalizeReaderCategory(book.library?.category ?? categories[book.packId] ?? (/scripture/i.test(book.title) ? 'Scripture' : 'General')),
    temporary: book.library?.temporary ?? false,
  }
}
