import type { VnAssetManifest, VnIndexEntry, VnScript } from './types'

const VN_INDEX_PATH = 'reader-packs/lms-books/visual-novels/index.json'

export async function loadVisualNovelIndex(): Promise<VnIndexEntry[]> {
  try {
    const response = await fetch(publicPath(VN_INDEX_PATH))
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = (await response.json()) as { visualNovels?: VnIndexEntry[] } | VnIndexEntry[]
    return Array.isArray(data) ? data : data.visualNovels ?? []
  } catch (error) {
    console.warn('Could not load visual novel index.', error)
    return []
  }
}

export async function loadVisualNovelScript(entry: VnIndexEntry): Promise<VnScript> {
  const response = await fetch(publicPath(entry.scriptPath))
  if (!response.ok) {
    throw new Error(`Could not load ${entry.title}: HTTP ${response.status}`)
  }
  return (await response.json()) as VnScript
}

export async function loadVisualNovelAssetManifest(script: VnScript): Promise<VnAssetManifest> {
  const response = await fetch(publicPath(script.assetManifestPath))
  if (!response.ok) {
    throw new Error(`Could not load asset manifest for ${script.title}: HTTP ${response.status}`)
  }
  return (await response.json()) as VnAssetManifest
}

export function visualNovelAssetSrc(src: string): string {
  return publicPath(src)
}

function publicPath(path: string): string {
  const base = import.meta.env.BASE_URL || '/'
  return `${base.replace(/\/$/u, '')}/${path.replace(/^\//u, '')}`
}
