import type { VnAssetManifest, VnIndexEntry, VnScript, VnWorld, VnWorldIndexEntry } from './types'

const VN_INDEX_PATH = 'reader-packs/lms-books/visual-novels/index.json'
const VN_WORLD_INDEX_PATH = 'reader-packs/lms-books/visual-novels/worlds/index.json'
const VN_CONTENT_CACHE_VERSION = '2026-06-08-vn-world-hub-npc-v1'
const JSON_TIMEOUT_MS = 15000

export async function loadVisualNovelIndex(): Promise<VnIndexEntry[]> {
  try {
    const data = await fetchVisualNovelJson<{ visualNovels?: VnIndexEntry[] } | VnIndexEntry[]>(
      VN_INDEX_PATH,
      'visual novel index',
    )
    return Array.isArray(data) ? data : data.visualNovels ?? []
  } catch (error) {
    console.warn('Could not load visual novel index.', error)
    return []
  }
}

export async function loadVisualNovelScript(entry: VnIndexEntry): Promise<VnScript> {
  return fetchVisualNovelJson<VnScript>(entry.scriptPath, entry.title)
}

export async function loadVisualNovelAssetManifest(script: VnScript): Promise<VnAssetManifest> {
  return fetchVisualNovelJson<VnAssetManifest>(script.assetManifestPath, `asset manifest for ${script.title}`)
}

export async function loadVisualNovelWorldIndex(): Promise<VnWorldIndexEntry[]> {
  try {
    const data = await fetchVisualNovelJson<{ worlds?: VnWorldIndexEntry[] } | VnWorldIndexEntry[]>(
      VN_WORLD_INDEX_PATH,
      'visual novel world index',
    )
    return Array.isArray(data) ? data : data.worlds ?? []
  } catch (error) {
    console.warn('Could not load visual novel world index.', error)
    return []
  }
}

export async function loadVisualNovelWorld(entry: VnWorldIndexEntry): Promise<VnWorld> {
  return fetchVisualNovelJson<VnWorld>(entry.worldPath, entry.title)
}

export async function loadVisualNovelQuestScript(world: VnWorld, scriptPath: string): Promise<VnScript> {
  return fetchVisualNovelJson<VnScript>(scriptPath, `quest script for ${world.title}`)
}

export async function loadVisualNovelWorldAssetManifest(world: VnWorld): Promise<VnAssetManifest> {
  return fetchVisualNovelJson<VnAssetManifest>(world.assetManifestPath, `asset manifest for ${world.title}`)
}

export function visualNovelAssetSrc(src: string): string {
  return publicPath(src)
}

function publicPath(path: string): string {
  const base = import.meta.env.BASE_URL || '/'
  return `${base.replace(/\/$/u, '')}/${path.replace(/^\//u, '')}`
}

async function fetchVisualNovelJson<T>(path: string, label: string): Promise<T> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), JSON_TIMEOUT_MS)
  try {
    const url = new URL(publicPath(path), window.location.origin)
    url.searchParams.set('v', VN_CONTENT_CACHE_VERSION)
    const response = await fetch(url, {
      cache: 'no-store',
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return (await response.json()) as T
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`Timed out loading ${label}. Try resetting the app shell cache.`, { cause: error })
    }
    throw new Error(`Could not load ${label}. ${error instanceof Error ? error.message : String(error)}`, {
      cause: error,
    })
  } finally {
    window.clearTimeout(timeout)
  }
}
