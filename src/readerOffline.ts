import type { ReaderBook } from './types'

export const READER_OFFLINE_CACHE = 'chunky-reader-downloads-v1'

export interface ReaderOfflineStatus {
  cached: number
  total: number
  complete: boolean
}

export interface ReaderOfflineDownloadResult extends ReaderOfflineStatus {
  failed: number
}

export function readerBookOfflineAssetUrls(book: ReaderBook): string[] {
  const urls = new Set<string>()
  if (book.coverImage && !book.coverImage.startsWith('data:')) {
    urls.add(readerBookAssetUrl(book, book.coverImage))
  }
  for (const illustration of book.illustrations ?? []) {
    urls.add(publicAssetUrl(illustration.imageFilename))
    if (illustration.fallbackImageFilename) urls.add(publicAssetUrl(illustration.fallbackImageFilename))
  }
  const sentenceCount = book.stories.reduce((sum, story) => sum + story.sentences.length, 0)
  if (book.id.startsWith('lms-book-1-chapters-')) {
    if (book.id === 'lms-book-1-chapters-16-20') {
      for (let sentence = 1; sentence <= sentenceCount; sentence += 1) {
        urls.add(publicAssetUrl(`reader-packs/lms-books/images/${book.id}/sentence-${String(sentence).padStart(3, '0')}.webp`))
      }
    } else {
      for (let image = 1; image <= Math.ceil(sentenceCount / 2); image += 1) {
        urls.add(publicAssetUrl(`reader-packs/lms-books/images/${book.id}/illustration-${String(image).padStart(3, '0')}.webp`))
      }
    }
  }
  for (const sentence of book.stories.flatMap((story) => story.sentences)) {
    if (sentence.audioFilename) urls.add(publicAssetUrl(sentence.audioFilename))
  }
  return [...urls]
}

export async function getReaderBookOfflineStatus(book: ReaderBook): Promise<ReaderOfflineStatus> {
  if (!('caches' in window)) return { cached: 0, total: 0, complete: false }
  const urls = readerBookOfflineAssetUrls(book)
  const cache = await caches.open(READER_OFFLINE_CACHE)
  const matches = await Promise.all(urls.map((url) => cache.match(url)))
  const cached = matches.filter(Boolean).length
  return { cached, total: urls.length, complete: urls.length > 0 && cached === urls.length }
}

export async function downloadReaderBookForOffline(
  book: ReaderBook,
  onProgress?: (completed: number, total: number) => void,
): Promise<ReaderOfflineDownloadResult> {
  if (!('caches' in window)) throw new Error('Offline downloads are not supported in this browser.')
  const urls = readerBookOfflineAssetUrls(book)
  const cache = await caches.open(READER_OFFLINE_CACHE)
  let completed = 0
  let failed = 0
  let nextIndex = 0

  const worker = async () => {
    while (nextIndex < urls.length) {
      const url = urls[nextIndex]
      nextIndex += 1
      try {
        if (!(await cache.match(url))) {
          const response = await fetch(url)
          if (!response.ok) throw new Error(`HTTP ${response.status}`)
          await cache.put(url, response.clone())
        }
      } catch {
        failed += 1
      }
      completed += 1
      onProgress?.(completed, urls.length)
    }
  }
  await Promise.all(Array.from({ length: Math.min(6, urls.length) }, () => worker()))
  const status = await getReaderBookOfflineStatus(book)
  return { ...status, failed }
}

export async function removeReaderBookOfflineDownload(book: ReaderBook): Promise<void> {
  if (!('caches' in window)) return
  const cache = await caches.open(READER_OFFLINE_CACHE)
  await Promise.all(readerBookOfflineAssetUrls(book).map((url) => cache.delete(url)))
}

function publicAssetUrl(path: string): string {
  const base = import.meta.env.BASE_URL || '/'
  return `${base.replace(/\/$/u, '')}/${path.replace(/^\//u, '')}`
}

function readerBookAssetUrl(book: ReaderBook, path: string): string {
  const base = import.meta.env.BASE_URL || '/'
  return `${base.replace(/\/$/u, '')}/reader-packs/${book.packId}/${path.replace(/^\//u, '')}`
}
