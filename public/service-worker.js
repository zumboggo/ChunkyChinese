const CACHE_VERSION = 'chunky-chinese-v50'
const READER_OFFLINE_CACHE = 'chunky-reader-downloads-v1'
// Change CACHE_VERSION whenever the app shell changes and you want browsers to
// discard old cached files. The activate handler below removes older versions.
const APP_BASE = new URL('./', self.location.href).pathname
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
    const response = await fetch(request)
    if (response.ok) await cache.put(request, response.clone())
    return response
  } catch {
    for (const fallback of fallbacks) {
      const cached = await cache.match(fallback)
      if (cached) return cached
    }
    throw new Error(`No cached response for ${request.url}`)
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_VERSION)
  const cached = await cache.match(request)
  if (cached) return cached

  const response = await fetch(request)
  if (response.ok) await cache.put(request, response.clone())
  return response
}

async function readerOfflineFirst(request) {
  const offlineCache = await caches.open(READER_OFFLINE_CACHE)
  const downloaded = await offlineCache.match(request)
  if (downloaded) return downloaded
  if (new URL(request.url).pathname.endsWith('.mp3')) return fetch(request)
  return cacheFirst(request)
}

function isReaderMediaAsset(url) {
  return (
    url.pathname.startsWith(`${APP_BASE}reader-packs/`) &&
    /\.(?:mp3|webp|png|jpe?g|avif)$/i.test(url.pathname)
  )
}

function isStaticAppAsset(url) {
  return (
    url.pathname.startsWith(`${APP_BASE}assets/`) ||
    url.pathname.startsWith(`${APP_BASE}icons/`) ||
    url.pathname.startsWith(`${APP_BASE}seed/`) ||
    url.pathname.startsWith(`${APP_BASE}dictionary/`) ||
    (url.pathname.startsWith(`${APP_BASE}reader-packs/`) && !url.pathname.endsWith('.mp3')) ||
    url.pathname.endsWith('/manifest.webmanifest') ||
    url.pathname.endsWith('/service-worker.js') ||
    url.pathname.endsWith('.svg')
  )
}

function isMutableContentAsset(url) {
  return (
    url.pathname.startsWith(`${APP_BASE}reader-packs/`) &&
    (url.pathname.endsWith('.json') || url.pathname.endsWith('/reader_manifest.json'))
  )
}
