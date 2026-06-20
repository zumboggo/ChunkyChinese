import JSZip from 'jszip'
import {
  collectReaderComprehensionTokens,
  readerComprehensionCategory,
} from '../adaptiveText'
import type {
  ComicBubble,
  ComicBubbleType,
  ComicChapter,
  ComicChapterRecord,
  ComicChapterReference,
  ComicCoverageSummary,
  ComicPackManifest,
  ComicProgress,
  ComicTranslationMode,
  VocabWord,
} from '../types'

export const COMIC_PACK_FORMAT = 'chunky-comic-pack'
export const COMIC_PACK_FORMAT_VERSION = 1
export const DEFAULT_COMIC_TRANSLATION_MODE: ComicTranslationMode = 'tap'

export interface ParsedComicPack {
  manifest: ComicPackManifest
  chapters: ComicChapter[]
  images: Map<string, Blob>
  imageContentTypes: Map<string, string>
  warnings: string[]
}

const COMIC_BUBBLE_TYPES = new Set<ComicBubbleType>([
  'dialogue',
  'narration',
  'thought',
  'sfx',
])

export function comicChapterRecordId(packId: string, chapterId: string): string {
  return `${packId}:${chapterId}`
}

export function comicImageRecordId(packId: string, imagePath: string): string {
  return `${packId}:${imagePath}`
}

export function comicProgressId(packId: string): string {
  return `${packId}:progress`
}

export function isComicPackDuplicateError(error: unknown): boolean {
  return error instanceof Error && error.message.includes('already exists')
}

export function shouldShowComicTranslation(
  mode: ComicTranslationMode,
  bubbleId: string,
  revealedBubbleIds: Set<string>,
): boolean {
  if (mode === 'visible') return true
  return revealedBubbleIds.has(bubbleId)
}

export function nextComicBubbleId(
  bubbles: ComicBubble[],
  currentBubbleId: string | null,
): string | null {
  const currentIndex = currentBubbleId
    ? bubbles.findIndex((bubble) => bubble.id === currentBubbleId)
    : -1
  return bubbles[currentIndex + 1]?.id ?? null
}

export function adjacentComicImagePaths(
  chapters: ComicChapterRecord[],
  chapterId: string,
  pageIndex: number,
): string[] {
  const pages = chapters.flatMap((chapter) =>
    chapter.pages.map((page, index) => ({
      chapterId: chapter.id,
      pageIndex: index,
      image: page.image,
    })),
  )
  const currentIndex = pages.findIndex(
    (page) => page.chapterId === chapterId && page.pageIndex === pageIndex,
  )
  if (currentIndex < 0) return []
  return [pages[currentIndex], pages[currentIndex - 1], pages[currentIndex + 1]]
    .filter((page): page is NonNullable<typeof page> => Boolean(page))
    .map((page) => page.image)
    .filter((path, index, paths) => paths.indexOf(path) === index)
}

export function normalizeComicPath(path: unknown, label = 'path'): string {
  if (typeof path !== 'string' || path.trim().length === 0) {
    throw new Error(`Comic pack ${label} is missing.`)
  }
  const trimmed = path.trim()
  if (
    trimmed.startsWith('/') ||
    trimmed.startsWith('\\') ||
    trimmed.includes('\\') ||
    trimmed.split('/').some((part) => part === '..' || part === '')
  ) {
    throw new Error(`Comic pack ${label} "${trimmed}" is not a safe relative path.`)
  }
  return trimmed
}

export async function parseComicPackZip(file: Blob | ArrayBuffer): Promise<ParsedComicPack> {
  const data = file instanceof Blob ? await file.arrayBuffer() : file
  const zip = await JSZip.loadAsync(data)
  const files = Object.values(zip.files).filter((entry) => !entry.dir)
  if (files.length === 0) throw new Error('Comic pack ZIP is empty.')

  const manifestFile = zip.file('manifest.json')
  if (!manifestFile) throw new Error('Comic pack is missing manifest.json at the ZIP root.')

  const manifest = validateComicManifest(await readJson(manifestFile, 'manifest.json'))
  const chapters: ComicChapter[] = []
  const warnings: string[] = []
  const imagePaths = new Set<string>()
  const chapterIds = new Set<string>()
  const chapterFiles = new Set<string>()

  if (manifest.coverImage) {
    imagePaths.add(normalizeComicPath(manifest.coverImage, 'coverImage'))
  }

  for (const [index, ref] of manifest.chapters.entries()) {
    if (chapterIds.has(ref.id)) throw new Error(`Duplicate chapter id "${ref.id}".`)
    chapterIds.add(ref.id)
    if (chapterFiles.has(ref.file)) throw new Error(`Duplicate chapter file "${ref.file}".`)
    chapterFiles.add(ref.file)

    const chapterFile = zip.file(ref.file)
    if (!chapterFile) throw new Error(`Referenced chapter file "${ref.file}" is missing.`)
    const chapter = validateComicChapter(await readJson(chapterFile, ref.file), ref, index)
    chapters.push(chapter)
    for (const page of chapter.pages) imagePaths.add(page.image)
  }

  const images = new Map<string, Blob>()
  const imageContentTypes = new Map<string, string>()
  for (const path of imagePaths) {
    const imageFile = zip.file(path)
    if (!imageFile) throw new Error(`Referenced image "${path}" is missing.`)
    const blob = new Blob([await imageFile.async('arraybuffer')], { type: contentTypeForPath(path) })
    images.set(path, blob)
    imageContentTypes.set(path, contentTypeForPath(path))
  }

  return { manifest, chapters, images, imageContentTypes, warnings }
}

export function validateComicManifest(value: unknown): ComicPackManifest {
  if (!isRecord(value)) throw new Error('manifest.json must contain a JSON object.')
  if (value.format !== COMIC_PACK_FORMAT) {
    throw new Error(`Unsupported comic pack format "${String(value.format)}".`)
  }
  if (value.formatVersion !== COMIC_PACK_FORMAT_VERSION) {
    throw new Error(`Unsupported comic pack formatVersion "${String(value.formatVersion)}".`)
  }
  const id = requiredString(value.id, 'manifest id')
  const title = requiredString(value.title, 'manifest title')
  const language = value.language
  if (language !== 'zh-CN' && language !== 'zh-TW') {
    throw new Error('Comic pack language must be zh-CN or zh-TW.')
  }
  if (!Array.isArray(value.chapters) || value.chapters.length === 0) {
    throw new Error('Comic pack manifest must include at least one chapter.')
  }

  return {
    format: COMIC_PACK_FORMAT,
    formatVersion: COMIC_PACK_FORMAT_VERSION,
    id,
    title,
    titleChinese: optionalString(value.titleChinese),
    author: optionalString(value.author),
    description: optionalString(value.description),
    language,
    coverImage: value.coverImage === undefined ? undefined : normalizeComicPath(value.coverImage, 'coverImage'),
    chapters: value.chapters.map((chapter, index) => validateComicChapterReference(chapter, index)),
  }
}

export function validateComicChapterReference(value: unknown, index: number): ComicChapterReference {
  if (!isRecord(value)) throw new Error(`Chapter reference ${index + 1} must be an object.`)
  return {
    id: requiredString(value.id, `chapter reference ${index + 1} id`),
    title: requiredString(value.title, `chapter reference ${index + 1} title`),
    titleChinese: optionalString(value.titleChinese),
    file: normalizeComicPath(value.file, `chapter reference ${index + 1} file`),
  }
}

export function validateComicChapter(value: unknown, ref: ComicChapterReference, index: number): ComicChapter {
  if (!isRecord(value)) throw new Error(`Chapter file "${ref.file}" must contain a JSON object.`)
  const id = requiredString(value.id, `chapter ${index + 1} id`)
  if (id !== ref.id) throw new Error(`Chapter file "${ref.file}" id "${id}" does not match manifest id "${ref.id}".`)
  if (!Array.isArray(value.pages) || value.pages.length === 0) {
    throw new Error(`Chapter "${id}" must include at least one page.`)
  }

  const pageIds = new Set<string>()
  const pages = value.pages.map((page, pageIndex) => {
    const normalized = validateComicPage(page, id, pageIndex)
    if (pageIds.has(normalized.id)) throw new Error(`Duplicate page id "${normalized.id}" in chapter "${id}".`)
    pageIds.add(normalized.id)
    return normalized
  })

  return {
    id,
    title: requiredString(value.title, `chapter ${id} title`),
    titleChinese: optionalString(value.titleChinese),
    pages,
  }
}

function validateComicPage(value: unknown, chapterId: string, index: number) {
  if (!isRecord(value)) throw new Error(`Page ${index + 1} in chapter "${chapterId}" must be an object.`)
  if (!Array.isArray(value.bubbles)) {
    throw new Error(`Page ${index + 1} in chapter "${chapterId}" must include bubbles.`)
  }
  const id = requiredString(value.id, `page ${index + 1} id`)
  const bubbleIds = new Set<string>()
  const bubbles = value.bubbles.map((bubble, bubbleIndex) => {
    const normalized = validateComicBubble(bubble, id, bubbleIndex)
    if (bubbleIds.has(normalized.id)) throw new Error(`Duplicate bubble id "${normalized.id}" on page "${id}".`)
    bubbleIds.add(normalized.id)
    return normalized
  }).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))

  return {
    id,
    image: normalizeComicPath(value.image, `page ${id} image`),
    width: optionalPositiveNumber(value.width, `page ${id} width`),
    height: optionalPositiveNumber(value.height, `page ${id} height`),
    bubbles,
  }
}

function validateComicBubble(value: unknown, pageId: string, index: number): ComicBubble {
  if (!isRecord(value)) throw new Error(`Bubble ${index + 1} on page "${pageId}" must be an object.`)
  const type = value.type
  if (!COMIC_BUBBLE_TYPES.has(type as ComicBubbleType)) {
    throw new Error(`Bubble "${String(value.id ?? index + 1)}" on page "${pageId}" has an unsupported type.`)
  }
  const chinese = requiredString(value.chinese, `bubble ${index + 1} chinese`)
  const order = optionalPositiveNumber(value.order, `bubble ${index + 1} order`)
  if (order === undefined) throw new Error(`Bubble "${String(value.id ?? index + 1)}" on page "${pageId}" needs an order.`)

  return {
    id: requiredString(value.id, `bubble ${index + 1} id`),
    order,
    chinese,
    english: optionalString(value.english),
    type: type as ComicBubbleType,
    box: value.box === undefined ? undefined : validateComicBubbleBox(value.box, pageId, index),
  }
}

function validateComicBubbleBox(value: unknown, pageId: string, index: number): ComicBubble['box'] {
  if (!isRecord(value)) throw new Error(`Bubble ${index + 1} box on page "${pageId}" must be an object.`)
  const box = {
    x: normalizedNumber(value.x, 'x'),
    y: normalizedNumber(value.y, 'y'),
    width: normalizedNumber(value.width, 'width'),
    height: normalizedNumber(value.height, 'height'),
  }
  if (box.x + box.width > 1 || box.y + box.height > 1) {
    throw new Error(`Bubble ${index + 1} box on page "${pageId}" extends outside the page.`)
  }
  return box
}

export function calculateComicCoverage(chapter: ComicChapter, words: VocabWord[]): ComicCoverageSummary {
  const wordMap = new Map(words.map((word) => [word.word, word]))
  const maxWordLength = Math.max(1, ...words.map((word) => Math.min(word.word.length, 8)))
  const uniqueWords = new Set<string>()
  const uniqueUnknownWords = new Set<string>()
  let totalOccurrences = 0
  let knownOccurrences = 0
  let familiarOccurrences = 0
  let learningOccurrences = 0
  let unknownOccurrences = 0

  for (const page of chapter.pages) {
    for (const bubble of page.bubbles) {
      if (bubble.type === 'sfx') continue
      for (const token of collectReaderComprehensionTokens(bubble.chinese, wordMap, maxWordLength)) {
        totalOccurrences += 1
        uniqueWords.add(token.text)
        if (token.word?.status === 'known' || readerComprehensionCategory(token.word) === 'known') {
          knownOccurrences += 1
        } else if (token.word?.status === 'familiar') {
          familiarOccurrences += 1
        } else if (token.word) {
          learningOccurrences += 1
          uniqueUnknownWords.add(token.text)
        } else {
          unknownOccurrences += 1
          uniqueUnknownWords.add(token.text)
        }
      }
    }
  }

  return {
    totalOccurrences,
    uniqueWords: uniqueWords.size,
    knownOccurrences,
    familiarOccurrences,
    learningOccurrences,
    unknownOccurrences,
    knownPercent: totalOccurrences > 0 ? Math.round((knownOccurrences / totalOccurrences) * 100) : 0,
    uniqueUnknownWords: uniqueUnknownWords.size,
  }
}

export function makeDefaultComicProgress(packId: string, chapterId: string): ComicProgress {
  return {
    id: comicProgressId(packId),
    packId,
    chapterId,
    pageIndex: 0,
    updatedAt: new Date().toISOString(),
    translationMode: DEFAULT_COMIC_TRANSLATION_MODE,
    showSoundEffects: false,
  }
}

async function readJson(file: JSZip.JSZipObject, label: string): Promise<unknown> {
  try {
    return JSON.parse(await file.async('text'))
  } catch (error) {
    throw new Error(`${label} contains malformed JSON. ${error instanceof Error ? error.message : ''}`.trim(), {
      cause: error,
    })
  }
}

function contentTypeForPath(path: string): string {
  const lower = path.toLowerCase()
  if (lower.endsWith('.svg')) return 'image/svg+xml'
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  if (lower.endsWith('.webp')) return 'image/webp'
  return 'application/octet-stream'
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) throw new Error(`Comic pack ${label} is missing.`)
  return value.trim()
}

function optionalString(value: unknown): string | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function optionalPositiveNumber(value: unknown, label: string): number | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new Error(`Comic pack ${label} must be a positive number.`)
  }
  return value
}

function normalizedNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`Comic bubble box ${label} must be between 0 and 1.`)
  }
  return value
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
