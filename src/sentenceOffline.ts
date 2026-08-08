import { LMS_SENTENCE_POOL, sentenceSeedAudioUrl } from './sentenceListening'
import type { SentencePool } from './sentenceListening'

export const SENTENCE_OFFLINE_CACHE = 'chunky-sentence-listening-v1'

export interface SentenceOfflineResult {
  cached: number
  total: number
  failed: number
  complete: boolean
}

export function sentenceOfflineAssetUrls(
  sentences: Array<{ word: string }>,
  pool: SentencePool = LMS_SENTENCE_POOL,
): string[] {
  const urls = new Set<string>()
  for (const sentence of sentences) {
    urls.add(publicAssetUrl(sentenceSeedAudioUrl(sentence.word, 'zh', pool)))
    urls.add(publicAssetUrl(sentenceSeedAudioUrl(sentence.word, 'en', pool)))
  }
  return [...urls]
}

export async function downloadSentenceListeningForOffline(
  sentences: Array<{ word: string }>,
  onProgress?: (completed: number, total: number) => void,
  pool: SentencePool = LMS_SENTENCE_POOL,
): Promise<SentenceOfflineResult> {
  if (!('caches' in window)) {
    throw new Error('Offline sentence downloads are not supported in this browser.')
  }
  const urls = sentenceOfflineAssetUrls(sentences, pool)
  const cache = await caches.open(SENTENCE_OFFLINE_CACHE)
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
  const matches = await Promise.all(urls.map((url) => cache.match(url)))
  const cached = matches.filter(Boolean).length
  return {
    cached,
    total: urls.length,
    failed,
    complete: urls.length > 0 && cached === urls.length,
  }
}

function publicAssetUrl(path: string): string {
  const base = import.meta.env.BASE_URL || '/'
  return `${base.replace(/\/$/u, '')}/${path.replace(/^\//u, '')}`
}
