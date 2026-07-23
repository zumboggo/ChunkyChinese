const CACHE_VERSION = 'chunky-chinese-v53'
const READER_OFFLINE_CACHE = 'chunky-reader-downloads-v1'
const SENTENCE_OFFLINE_CACHE = 'chunky-sentence-listening-v1'
// Change CACHE_VERSION whenever the app shell changes and you want browsers to
// discard old cached files. The activate handler below removes older versions.
const APP_BASE = new URL('./', self.location.href).pathname
const FLIGHT_CORE = [
  `${APP_BASE}dictionary/cedict.json`,
  `${APP_BASE}clip-packs/index.json`,
  `${APP_BASE}reader-packs/index.json`,
]
const APP_SHELL = [
  APP_BASE,
  `${APP_BASE}index.html`,
  `${APP_BASE}manifest.webmanifest`,
  `${APP_BASE}icons/icon-192.png`,
  `${APP_BASE}icons/icon-512.png`,
  `${APP_BASE}icons/chunky-logo.png`,
  `${APP_BASE}seed/lms-vocab-1000.csv`,
  `${APP_BASE}seed/lms-sentences.json`,
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_VERSION)
      const shellUrls = await discoverAppShellUrls()
      // A missing optional asset must not prevent a new worker from activating.
      await Promise.allSettled(
        [...new Set([...APP_SHELL, ...shellUrls])].map(async (url) => {
          const response = await fetch(url, { cache: 'reload' })
          if (response.ok) await cache.put(url, response)
        }),
      )
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys
          .filter((key) => key.startsWith('chunky-chinese-') && key !== CACHE_VERSION)
          .map((key) => caches.delete(key)),
      )
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    event.waitUntil(self.skipWaiting())
    return
  }
  if (event.data?.type === 'PREPARE_OFFLINE') {
    event.waitUntil(
      (async () => {
        try {
          const discovered = await discoverAppShellUrls()
          const requested = Array.isArray(event.data.resources)
            ? event.data.resources.filter(isSafeOfflineResource)
            : []
          const result = await cacheOfflineUrls([
            ...APP_SHELL,
            ...FLIGHT_CORE,
            ...discovered,
            ...requested,
          ])
          event.ports[0]?.postMessage(result)
        } catch (error) {
          event.ports[0]?.postMessage({
            cached: 0,
            failed: 1,
            error: error instanceof Error ? error.message : 'Could not prepare the app for offline use.',
          })
        }
      })(),
    )
  }
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin || !url.pathname.startsWith(APP_BASE)) return

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstHtml(request))
    return
  }

  if (isMutableContentAsset(url)) {
    event.respondWith(networkFirstAsset(request))
    return
  }

  if (isReaderMediaAsset(url)) {
    event.respondWith(readerOfflineFirst(request))
    return
  }

  if (isSentenceAudioAsset(url)) {
    event.respondWith(sentenceOfflineFirst(request))
    return
  }

  if (isStaticAppAsset(url)) {
    event.respondWith(cacheFirst(request))
    return
  }

  // TODO: Add opt-in MP3 clip-pack caching here if hosted audio needs to become
  // fully offline before importing into IndexedDB. The current app stores
  // imported clips in IndexedDB and avoids precaching every MP3 by default.
})

async function discoverAppShellUrls() {
  try {
    const response = await fetch(`${APP_BASE}index.html`, { cache: 'reload' })
    if (!response.ok) return []
    const html = await response.text()
    const urls = []
    const assetPattern = /\b(?:src|href)=["']([^"']+\.(?:js|css))["']/g
    for (const match of html.matchAll(assetPattern)) {
      urls.push(new URL(match[1], self.location.origin).pathname)
    }
    return urls.filter((pathname) => pathname.startsWith(APP_BASE))
  } catch {
    return []
  }
}

async function networkFirstHtml(request) {
  return networkFirstAsset(request, [request, `${APP_BASE}index.html`, APP_BASE])
}

async function networkFirstAsset(request, fallbacks = [request]) {
  const cache = await caches.open(CACHE_VERSION)
  try {
    const response = await fetchWithTimeout(request)
    if (response.ok) await cache.put(request, response.clone())
    return response
  } catch {
    for (const fallback of fallbacks) {
      const cached = await cache.match(fallback, { ignoreVary: true })
      if (cached) return cached
    }
    throw new Error(`No cached response for ${request.url}`)
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_VERSION)
  const cached = await cache.match(request, { ignoreVary: true })
  if (cached) return cached

  const response = await fetchWithTimeout(request)
  if (response.ok) await cache.put(request, response.clone())
  return response
}

async function readerOfflineFirst(request) {
  const offlineCache = await caches.open(READER_OFFLINE_CACHE)
  const downloaded = await offlineCache.match(request, { ignoreVary: true })
  if (downloaded) return downloaded
  if (new URL(request.url).pathname.endsWith('.mp3')) return fetchWithTimeout(request)
  return cacheFirst(request)
}

async function sentenceOfflineFirst(request) {
  const offlineCache = await caches.open(SENTENCE_OFFLINE_CACHE)
  const downloaded = await offlineCache.match(request, { ignoreVary: true })
  if (downloaded) return downloaded
  return cacheFirst(request)
}

function isReaderMediaAsset(url) {
  return (
    url.pathname.startsWith(`${APP_BASE}reader-packs/`) &&
    /\.(?:mp3|webp|png|jpe?g|avif)$/i.test(url.pathname)
  )
}

function isSentenceAudioAsset(url) {
  return (
    url.pathname.startsWith(`${APP_BASE}seed/sentence-audio/`) &&
    url.pathname.endsWith('.mp3')
  )
}

function isStaticAppAsset(url) {
  return (
    url.pathname.startsWith(`${APP_BASE}assets/`) ||
    url.pathname.startsWith(`${APP_BASE}src/`) ||
    url.pathname.startsWith(`${APP_BASE}node_modules/.vite/`) ||
    url.pathname.startsWith(`${APP_BASE}icons/`) ||
    url.pathname.startsWith(`${APP_BASE}seed/`) ||
    url.pathname.startsWith(`${APP_BASE}dictionary/`) ||
    (url.pathname.startsWith(`${APP_BASE}reader-packs/`) && !url.pathname.endsWith('.mp3')) ||
    url.pathname.endsWith('/manifest.webmanifest') ||
    url.pathname.endsWith('/service-worker.js') ||
    /\.(?:js|mjs|css|tsx?|jsx?|svg|woff2?)$/i.test(url.pathname)
  )
}

function isMutableContentAsset(url) {
  return (
    url.pathname.startsWith(`${APP_BASE}reader-packs/`) &&
    (url.pathname.endsWith('.json') || url.pathname.endsWith('/reader_manifest.json'))
  )
}

async function cacheOfflineUrls(urls) {
  const cache = await caches.open(CACHE_VERSION)
  let cached = 0
  let failed = 0
  const uniqueUrls = [...new Set(urls)]
  const workers = Array.from({ length: Math.min(6, uniqueUrls.length) }, async (_, workerIndex) => {
    for (let index = workerIndex; index < uniqueUrls.length; index += 6) {
      const url = uniqueUrls[index]
      try {
        const response = await fetch(url, { cache: 'reload' })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        await cache.put(url, response)
        cached += 1
      } catch {
        failed += 1
      }
    }
  })
  await Promise.all(workers)
  return { cached, failed }
}

function isSafeOfflineResource(value) {
  try {
    const url = new URL(value, self.location.origin)
    return url.origin === self.location.origin && url.pathname.startsWith(APP_BASE)
  } catch {
    return false
  }
}

async function fetchWithTimeout(request, timeoutMs = 5000) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(request, { signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}
