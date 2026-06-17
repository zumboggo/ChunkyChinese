import 'fake-indexeddb/auto'
import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { getComicProgress, importComicPack, saveComicProgress } from '../db'
import {
  calculateComicCoverage,
  comicProgressId,
  parseComicPackZip,
  shouldShowComicTranslation,
} from './comicPack'
import type { ComicChapter, ComicPackManifest, ComicProgress, VocabWord } from '../types'

describe('comic pack parsing and validation', () => {
  it('parses a valid manifest, chapter, ordered bubbles, and images', async () => {
    const pack = await parseComicPackZip(await buildComicZip())

    expect(pack.manifest.id).toBe('test-comic')
    expect(pack.chapters).toHaveLength(1)
    expect(pack.images.has('images/page-001.svg')).toBe(true)
    expect(pack.chapters[0].pages[0].bubbles.map((bubble) => bubble.id)).toEqual(['bubble-a', 'bubble-b'])
  })

  it('rejects a ZIP without a root manifest', async () => {
    const zip = new JSZip()
    zip.file('nested/manifest.json', '{}')

    await expect(parseComicPackZip(await zip.generateAsync({ type: 'arraybuffer' }))).rejects.toThrow(/manifest\.json/)
  })

  it('rejects a referenced missing image', async () => {
    await expect(parseComicPackZip(await buildComicZip({ omitImage: true }))).rejects.toThrow(/Referenced image/)
  })

  it('rejects unsupported format versions', async () => {
    await expect(parseComicPackZip(await buildComicZip({
      manifestPatch: { formatVersion: 99 as never },
    }))).rejects.toThrow(/Unsupported comic pack formatVersion/)
  })

  it('rejects invalid normalized coordinates', async () => {
    await expect(parseComicPackZip(await buildComicZip({
      bubblePatch: { box: { x: 0.9, y: 0.1, width: 0.2, height: 0.2 } },
    }))).rejects.toThrow(/extends outside/)
  })

  it('rejects duplicate IDs', async () => {
    await expect(parseComicPackZip(await buildComicZip({ duplicateBubble: true }))).rejects.toThrow(/Duplicate bubble id/)
  })
})

describe('comic reader helpers', () => {
  it('calculates vocabulary coverage without creating cards', () => {
    const chapter = makeChapter()
    const coverage = calculateComicCoverage(chapter, [
      makeWord('饺子', { status: 'known' }),
      makeWord('发现', { status: 'familiar' }),
    ])

    expect(coverage.totalOccurrences).toBeGreaterThan(0)
    expect(coverage.knownOccurrences).toBeGreaterThan(0)
    expect(coverage.familiarOccurrences).toBeGreaterThan(0)
    expect(coverage.uniqueUnknownWords).toBeGreaterThan(0)
  })

  it('handles translation display modes', () => {
    expect(shouldShowComicTranslation('hidden', 'a', new Set(['a']))).toBe(false)
    expect(shouldShowComicTranslation('visible', 'a', new Set())).toBe(true)
    expect(shouldShowComicTranslation('tap', 'a', new Set(['a']))).toBe(true)
    expect(shouldShowComicTranslation('tap', 'a', new Set(['b']))).toBe(false)
  })

  it('saves and restores comic progress in IndexedDB', async () => {
    const summary = await importComicPack(await buildComicZip({
      manifestPatch: { id: `storage-test-${Date.now()}` },
    }))
    const progress: ComicProgress = {
      id: comicProgressId(summary.packId),
      packId: summary.packId,
      chapterId: 'chapter-01',
      pageIndex: 1,
      updatedAt: '2026-01-01T00:00:00.000Z',
      translationMode: 'visible',
      showSoundEffects: true,
    }

    await saveComicProgress(progress)
    await expect(getComicProgress(summary.packId)).resolves.toMatchObject({
      packId: summary.packId,
      pageIndex: 1,
      translationMode: 'visible',
      showSoundEffects: true,
    })
  })
})

async function buildComicZip(options: {
  manifestPatch?: Partial<ComicPackManifest> & Record<string, unknown>
  bubblePatch?: Record<string, unknown>
  omitImage?: boolean
  duplicateBubble?: boolean
} = {}): Promise<ArrayBuffer> {
  const manifest: ComicPackManifest = {
    format: 'chunky-comic-pack',
    formatVersion: 1,
    id: 'test-comic',
    title: 'Test Comic',
    titleChinese: '测试漫画',
    language: 'zh-CN',
    coverImage: 'images/page-001.svg',
    chapters: [
      {
        id: 'chapter-01',
        title: 'Chapter One',
        file: 'chapters/chapter-01.json',
      },
    ],
    ...options.manifestPatch,
  }
  const chapter = makeChapter(options.bubblePatch, options.duplicateBubble)
  const zip = new JSZip()
  zip.file('manifest.json', JSON.stringify(manifest))
  zip.file('chapters/chapter-01.json', JSON.stringify(chapter))
  if (!options.omitImage) {
    zip.file('images/page-001.svg', '<svg xmlns="http://www.w3.org/2000/svg"></svg>')
  }
  return await zip.generateAsync({ type: 'arraybuffer' })
}

function makeChapter(bubblePatch: Record<string, unknown> = {}, duplicateBubble = false): ComicChapter {
  return {
    id: 'chapter-01',
    title: 'Chapter One',
    titleChinese: '第一章',
    pages: [
      {
        id: 'page-001',
        image: 'images/page-001.svg',
        width: 900,
        height: 1300,
        bubbles: [
          {
            id: 'bubble-b',
            order: 2,
            chinese: '我发现饺子不见了。',
            english: 'I discovered the dumpling was gone.',
            type: 'dialogue',
            box: { x: 0.1, y: 0.1, width: 0.4, height: 0.12 },
            ...bubblePatch,
          },
          {
            id: duplicateBubble ? 'bubble-b' : 'bubble-a',
            order: 1,
            chinese: '早上，盘子空了。',
            english: 'In the morning, the plate was empty.',
            type: 'narration',
            box: { x: 0.1, y: 0.25, width: 0.5, height: 0.1 },
          },
        ],
      },
    ],
  }
}

function makeWord(word: string, patch: Partial<VocabWord> = {}): VocabWord {
  return {
    id: `word:${word}`,
    word,
    meaning: word,
    status: 'learning',
    seenCount: 0,
    correctCount: 0,
    wrongCount: 0,
    listenedSeconds: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...patch,
  }
}
