import type { VnAssetManifest, VnIndexEntry, VnScript, VnWorld, VnWorldIndexEntry } from './types'

const VN_INDEX_PATH = 'reader-packs/lms-books/visual-novels/index.json'
const VN_WORLD_INDEX_PATH = 'reader-packs/lms-books/visual-novels/worlds/index.json'

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

export async function loadVisualNovelWorldIndex(): Promise<VnWorldIndexEntry[]> {
  try {
    const response = await fetch(publicPath(VN_WORLD_INDEX_PATH))
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = (await response.json()) as { worlds?: VnWorldIndexEntry[] } | VnWorldIndexEntry[]
    return Array.isArray(data) ? data : data.worlds ?? []
  } catch (error) {
    console.warn('Could not load visual novel world index.', error)
    return []
  }
}

export async function loadVisualNovelWorld(entry: VnWorldIndexEntry): Promise<VnWorld> {
  const response = await fetch(publicPath(entry.worldPath))
  if (!response.ok) {
    throw new Error(`Could not load ${entry.title}: HTTP ${response.status}`)
  }
  return (await response.json()) as VnWorld
}

export async function loadVisualNovelQuestScript(world: VnWorld, scriptPath: string): Promise<VnScript> {
  const response = await fetch(publicPath(scriptPath))
  if (!response.ok) {
    throw new Error(`Could not load quest script for ${world.title}: HTTP ${response.status}`)
  }
  return (await response.json()) as VnScript
}

export async function loadVisualNovelWorldAssetManifest(world: VnWorld): Promise<VnAssetManifest> {
  const response = await fetch(publicPath(world.assetManifestPath))
  if (!response.ok) {
    throw new Error(`Could not load asset manifest for ${world.title}: HTTP ${response.status}`)
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
