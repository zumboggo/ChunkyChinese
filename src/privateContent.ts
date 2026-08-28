import JSZip from 'jszip'
import { PRIVATE_SENTENCE_AUDIO_PACKS } from './contentCatalog'
import { downloadPrivateContent } from './supabaseSync'

const SENTENCE_CACHE = 'chunky-sentence-listening-v1'
const INSTALL_VERSION = 'private-sentence-audio-v1'

export async function installPrivateSentenceAudio(
  onProgress?: (message: string) => void,
): Promise<void> {
  if (localStorage.getItem(INSTALL_VERSION) === 'ready') return
  const cache = await caches.open(SENTENCE_CACHE)
  for (const pack of PRIVATE_SENTENCE_AUDIO_PACKS) {
    onProgress?.(`Downloading ${pack.publicPrefix}…`)
    const archive = await downloadPrivateContent(pack.storagePath)
    const zip = await JSZip.loadAsync(archive)
    const entries = Object.values(zip.files).filter((entry) => !entry.dir)
    for (const entry of entries) {
      const blob = await entry.async('blob')
      const base = (import.meta.env.BASE_URL || '/').replace(/\/$/u, '')
      const url = `${base}/${pack.publicPrefix}/${entry.name.replace(/^\//u, '')}`
      await cache.put(url, new Response(blob, {
        headers: { 'Content-Type': entry.name.endsWith('.mp3') ? 'audio/mpeg' : 'application/json' },
      }))
    }
  }
  localStorage.setItem(INSTALL_VERSION, 'ready')
}
