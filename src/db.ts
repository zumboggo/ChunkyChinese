import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import {
  basenameWithoutExt,
  makeWordId,
  normalizeFilename,
  parseCsv,
  sentencesFromCsvRows,
  stableHash,
  vocabFromCsvRows,
} from './csv'
import type {
  AudioClip,
  ClipManifestEntry,
  ClipPackManifest,
  DashboardStats,
  ImportSummary,
  ListeningEvent,
  RenderedLesson,
  Sentence,
  VocabWord,
  WordStatus,
} from './types'

const DB_NAME = 'chunky-chinese-vocab'
const DB_VERSION = 2

interface ChunkyDB extends DBSchema {
  vocabWords: {
    key: string
    value: VocabWord
    indexes: { status: WordStatus; lessonNumber: number }
  }
  sentences: {
    key: string
    value: Sentence
  }
  audioClips: {
    key: string
    value: AudioClip
    indexes: { type: string; filename: string }
  }
  listeningEvents: {
    key: string
    value: ListeningEvent
    indexes: { timestamp: string; type: string }
  }
  renderedLessons: {
    key: string
    value: RenderedLesson
  }
  settings: {
    key: string
    value: unknown
  }
}

let dbPromise: Promise<IDBPDatabase<ChunkyDB>> | undefined

export function getDB(): Promise<IDBPDatabase<ChunkyDB>> {
  if (!dbPromise) {
    dbPromise = openDB<ChunkyDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('vocabWords')) {
          const words = db.createObjectStore('vocabWords', { keyPath: 'id' })
          words.createIndex('status', 'status')
          words.createIndex('lessonNumber', 'lessonNumber')
        }
        if (!db.objectStoreNames.contains('sentences')) {
          db.createObjectStore('sentences', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('audioClips')) {
          const audio = db.createObjectStore('audioClips', { keyPath: 'id' })
          audio.createIndex('type', 'type')
          audio.createIndex('filename', 'filename')
        }
        if (!db.objectStoreNames.contains('listeningEvents')) {
          const events = db.createObjectStore('listeningEvents', { keyPath: 'id' })
          events.createIndex('timestamp', 'timestamp')
          events.createIndex('type', 'type')
        }
        if (!db.objectStoreNames.contains('renderedLessons')) {
          db.createObjectStore('renderedLessons', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings')
        }
      },
    })
  }
  return dbPromise
}

export async function seedLmsWordsIfEmpty(): Promise<number> {
  const db = await getDB()
  const count = await db.count('vocabWords')
  if (count > 0) return 0

  const response = await fetch(`${import.meta.env.BASE_URL}seed/lms-vocab-188.csv`)
  if (!response.ok) return 0
  const rows = parseCsv(await response.text())
  const words = vocabFromCsvRows(rows)
  await upsertWords(words)
  await db.put('settings', new Date().toISOString(), 'lmsSeededAt')
  return words.length
}

export async function getAllWords(): Promise<VocabWord[]> {
  return (await (await getDB()).getAll('vocabWords')).sort((a, b) => {
    const lessonDelta = (a.lessonNumber ?? 9999) - (b.lessonNumber ?? 9999)
    if (lessonDelta !== 0) return lessonDelta
    return a.word.localeCompare(b.word, 'zh-Hans-CN')
  })
}

export async function getAllSentences(): Promise<Sentence[]> {
  return (await (await getDB()).getAll('sentences')).sort((a, b) =>
    a.chinese.localeCompare(b.chinese, 'zh-Hans-CN'),
  )
}

export async function getAllAudioClips(): Promise<AudioClip[]> {
  return await (await getDB()).getAll('audioClips')
}

export async function getAudioClip(id: string): Promise<AudioClip | undefined> {
  return await (await getDB()).get('audioClips', id)
}

export async function getPromptClip(promptId: string): Promise<AudioClip | undefined> {
  const clips = await getAllAudioClips()
  return clips.find(
    (clip) =>
      clip.type === 'prompt' &&
      (clip.manifestId === promptId ||
        clip.id === promptId ||
        normalizePromptId(clip.label) === promptId),
  )
}

export async function upsertWords(words: VocabWord[]): Promise<ImportSummary> {
  const db = await getDB()
  const tx = db.transaction('vocabWords', 'readwrite')
  let created = 0
  let updated = 0

  for (const word of words) {
    const existing = await tx.store.get(word.id)
    if (existing) {
      updated += 1
      await tx.store.put({
        ...existing,
        word: word.word,
        meaning: word.meaning,
        lessonNumber: word.lessonNumber ?? existing.lessonNumber,
        tags: word.tags?.length ? word.tags : existing.tags,
        partOfSpeech: word.partOfSpeech || existing.partOfSpeech,
        audioWordFilename: word.audioWordFilename || existing.audioWordFilename,
        audioMeaningFilename: word.audioMeaningFilename || existing.audioMeaningFilename,
        pinyin: word.pinyin || existing.pinyin,
        source: word.source || existing.source,
        notes: word.notes || existing.notes,
        updatedAt: new Date().toISOString(),
      })
    } else {
      created += 1
      await tx.store.put(word)
    }
  }

  await tx.done
  return { created, updated, skipped: 0, warnings: [] }
}

export async function upsertSentences(sentences: Sentence[]): Promise<ImportSummary> {
  const db = await getDB()
  const tx = db.transaction('sentences', 'readwrite')
  let created = 0
  let updated = 0

  for (const sentence of sentences) {
    const existing = await tx.store.get(sentence.id)
    if (existing) {
      updated += 1
      await tx.store.put({
        ...existing,
        chinese: sentence.chinese,
        english: sentence.english,
        targetWords: sentence.targetWords,
        difficulty: sentence.difficulty ?? existing.difficulty,
        tags: sentence.tags?.length ? sentence.tags : existing.tags,
        audioSentenceFilename:
          sentence.audioSentenceFilename || existing.audioSentenceFilename,
        audioEnglishFilename: sentence.audioEnglishFilename || existing.audioEnglishFilename,
        updatedAt: new Date().toISOString(),
      })
    } else {
      created += 1
      await tx.store.put(sentence)
    }
  }

  await tx.done
  return { created, updated, skipped: 0, warnings: [] }
}

export async function importVocabCsv(text: string): Promise<ImportSummary> {
  return await upsertWords(vocabFromCsvRows(parseCsv(text)))
}

export async function importSentencesCsv(text: string): Promise<ImportSummary> {
  return await upsertSentences(sentencesFromCsvRows(parseCsv(text)))
}

export async function updateWordStatus(
  wordIds: string[],
  status: WordStatus,
): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['vocabWords', 'listeningEvents'], 'readwrite')
  const now = new Date().toISOString()

  for (const id of wordIds) {
    const word = await tx.objectStore('vocabWords').get(id)
    if (!word) continue
    await tx.objectStore('vocabWords').put({
      ...word,
      status,
      lastReviewedAt: now,
      updatedAt: now,
    })
    await tx.objectStore('listeningEvents').put({
      id: `event:${crypto.randomUUID()}`,
      timestamp: now,
      type: statusToEvent(status),
      itemType: 'word',
      itemId: id,
    })
  }
  await tx.done
}

export async function recordEvent(event: Omit<ListeningEvent, 'id' | 'timestamp'>) {
  const db = await getDB()
  await db.put('listeningEvents', {
    ...event,
    id: `event:${crypto.randomUUID()}`,
    timestamp: new Date().toISOString(),
  })
}

export async function recordQuizAnswer(wordId: string, correct: boolean): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['vocabWords', 'listeningEvents'], 'readwrite')
  const word = await tx.objectStore('vocabWords').get(wordId)
  if (!word) {
    await tx.done
    return
  }

  const now = new Date().toISOString()
  await tx.objectStore('vocabWords').put({
    ...word,
    correctCount: word.correctCount + (correct ? 1 : 0),
    wrongCount: word.wrongCount + (correct ? 0 : 1),
    lastReviewedAt: now,
    updatedAt: now,
  })
  await tx.objectStore('listeningEvents').put({
    id: `event:${crypto.randomUUID()}`,
    timestamp: now,
    type: 'quiz_answer',
    itemType: 'quiz',
    itemId: wordId,
    correct,
  })
  await tx.done
}

export async function completeWordExposure(wordId: string, seconds = 0): Promise<void> {
  const db = await getDB()
  const word = await db.get('vocabWords', wordId)
  if (!word) return
  await db.put('vocabWords', {
    ...word,
    seenCount: word.seenCount + 1,
    listenedSeconds: word.listenedSeconds + seconds,
    lastReviewedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
}

export async function importAudioFiles(files: FileList | File[]): Promise<ImportSummary> {
  const fileArray = Array.from(files).filter((file) =>
    file.name.toLocaleLowerCase().endsWith('.mp3'),
  )
  const db = await getDB()
  const words = await db.getAll('vocabWords')
  const sentences = await db.getAll('sentences')
  const tx = db.transaction(['audioClips', 'vocabWords', 'sentences'], 'readwrite')
  let created = 0
  let updated = 0
  let linkedAudio = 0
  const warnings: string[] = []

  for (const file of fileArray) {
    const path = normalizeFilename(readRelativePath(file) || file.name)
    const filename = file.name
    const type = detectAudioType(path)
    const label = basenameWithoutExt(path)
    const id = `audio:${stableHash(`${path}|${file.size}|${file.lastModified}`)}`
    const existing = await tx.objectStore('audioClips').get(id)
    const clip: AudioClip = {
      id,
      type,
      label,
      filename,
      path,
      blob: file,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      linkedWordIds: existing?.linkedWordIds,
      linkedSentenceId: existing?.linkedSentenceId,
    }
    await tx.objectStore('audioClips').put(clip)
    if (existing) updated += 1
    else created += 1

    const linked = await linkClip(tx, clip, words, sentences)
    linkedAudio += linked
    if (linked === 0) warnings.push(`No match for ${path}`)
  }

  await tx.done
  return { created, updated, skipped: 0, linkedAudio, warnings }
}

export async function importClipPackFiles(files: FileList | File[]): Promise<ImportSummary> {
  const fileArray = Array.from(files)
  const fileByPath = new Map<string, File>()
  for (const file of fileArray) {
    const path = normalizeFilename(readRelativePath(file) || file.name)
    fileByPath.set(path, file)
    fileByPath.set(file.name.toLocaleLowerCase(), file)
  }

  const manifestFile = findPackFile(fileArray, 'clips_manifest.json')
  if (!manifestFile) {
    return {
      created: 0,
      updated: 0,
      skipped: 0,
      warnings: ['No clips_manifest.json found in the selected clip pack.'],
    }
  }

  const manifest = JSON.parse(await manifestFile.text()) as ClipPackManifest
  const warnings: string[] = []
  let importedWords = 0
  let importedSentences = 0

  const vocabFile = findPackFile(fileArray, manifest.vocabCsvPath ?? 'vocab.csv')
  if (vocabFile) {
    const summary = await importVocabCsv(await vocabFile.text())
    importedWords = summary.created + summary.updated
  } else {
    warnings.push('No vocab.csv found in clip pack.')
  }

  const sentencesFile = findPackFile(fileArray, manifest.sentencesCsvPath ?? 'sentences.csv')
  if (sentencesFile) {
    const summary = await importSentencesCsv(await sentencesFile.text())
    importedSentences = summary.created + summary.updated
  } else {
    warnings.push('No sentences.csv found in clip pack.')
  }

  const db = await getDB()
  const words = await db.getAll('vocabWords')
  const sentences = await db.getAll('sentences')
  const tx = db.transaction(['audioClips', 'vocabWords', 'sentences'], 'readwrite')
  let created = 0
  let updated = 0
  let skipped = 0
  let linkedAudio = 0

  for (const entry of manifest.clips ?? []) {
    const file = resolveManifestFile(fileByPath, entry.path)
    if (!file) {
      skipped += 1
      warnings.push(`Missing audio file: ${entry.path}`)
      continue
    }

    const existing = await tx.objectStore('audioClips').get(entry.id)
    const clip: AudioClip = {
      id: entry.id,
      type: entry.type,
      label: entry.label || entry.text || basenameWithoutExt(entry.path),
      filename: file.name,
      path: normalizeFilename(entry.path),
      blob: file,
      linkedWordIds: entry.linkedWordIds,
      linkedSentenceId: entry.linkedSentenceId,
      manifestId: entry.id,
      text: entry.text,
      language: entry.language,
      provider: entry.provider,
      voice: entry.voice,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    }
    await tx.objectStore('audioClips').put(clip)
    if (existing) updated += 1
    else created += 1
    linkedAudio += await linkClip(tx, clip, words, sentences, entry)
  }

  await tx.done
  await db.put('settings', manifest, 'lastClipPackManifest')
  return {
    created,
    updated,
    skipped,
    linkedAudio,
    importedWords,
    importedSentences,
    warnings,
  }
}

export async function importHostedClipPack(
  baseUrl: string,
  onProgress?: (completed: number, total: number, label: string) => void,
): Promise<ImportSummary> {
  const base = baseUrl.replace(/\/+$/, '')
  const manifest = (await fetchJson(`${base}/clips_manifest.json`)) as ClipPackManifest
  const warnings: string[] = []
  let importedWords = 0
  let importedSentences = 0

  if (manifest.vocabCsvPath) {
    const summary = await importVocabCsv(await fetchText(`${base}/${encodePath(manifest.vocabCsvPath)}`))
    importedWords = summary.created + summary.updated
  }
  if (manifest.sentencesCsvPath) {
    const summary = await importSentencesCsv(
      await fetchText(`${base}/${encodePath(manifest.sentencesCsvPath)}`),
    )
    importedSentences = summary.created + summary.updated
  }

  const db = await getDB()
  const existingClips = new Map((await db.getAll('audioClips')).map((clip) => [clip.id, clip]))
  const preparedClips: Array<{ entry: ClipManifestEntry; clip: AudioClip; existed: boolean }> = []
  const total = manifest.clips?.length ?? 0
  let skipped = 0

  for (const [index, entry] of (manifest.clips ?? []).entries()) {
    const existing = existingClips.get(entry.id)
    if (existing?.blob) {
      preparedClips.push({
        entry,
        existed: true,
        clip: manifestEntryToClip(entry, existing.blob, existing.createdAt),
      })
      onProgress?.(index + 1, total, entry.label || entry.text || entry.path)
      continue
    }

    try {
      const response = await fetch(`${base}/${encodePath(entry.path)}`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      preparedClips.push({
        entry,
        existed: false,
        clip: manifestEntryToClip(entry, await response.blob()),
      })
    } catch (error) {
      skipped += 1
      warnings.push(
        `Could not download ${entry.path}${error instanceof Error ? `: ${error.message}` : ''}`,
      )
    }
    onProgress?.(index + 1, total, entry.label || entry.text || entry.path)
  }

  const words = await db.getAll('vocabWords')
  const sentences = await db.getAll('sentences')
  const tx = db.transaction(['audioClips', 'vocabWords', 'sentences'], 'readwrite')
  let created = 0
  let updated = 0
  let linkedAudio = 0

  for (const prepared of preparedClips) {
    await tx.objectStore('audioClips').put(prepared.clip)
    if (prepared.existed) updated += 1
    else created += 1
    linkedAudio += await linkClip(tx, prepared.clip, words, sentences, prepared.entry)
  }

  await tx.done
  await db.put('settings', manifest, 'lastClipPackManifest')
  return {
    created,
    updated,
    skipped,
    linkedAudio,
    importedWords,
    importedSentences,
    warnings,
  }
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const db = await getDB()
  const words = await db.getAll('vocabWords')
  const events = await db.getAll('listeningEvents')
  const start = startOfToday()
  const todayEvents = events.filter((event) => new Date(event.timestamp) >= start)

  return {
    counts: {
      new: words.filter((word) => word.status === 'new').length,
      learning: words.filter((word) => word.status === 'learning').length,
      familiar: words.filter((word) => word.status === 'familiar').length,
      known: words.filter((word) => word.status === 'known').length,
      review: words.filter((word) => word.status === 'review').length,
    },
    minutesToday:
      todayEvents.reduce((sum, event) => sum + (event.seconds ?? 0), 0) / 60,
    clipsCompletedToday: todayEvents.filter((event) => event.type === 'complete').length,
    knownToday: todayEvents.filter((event) => event.type === 'mark_known').length,
  }
}

export async function saveRenderedLesson(lesson: RenderedLesson): Promise<void> {
  await (await getDB()).put('renderedLessons', lesson)
}

export async function getAllRenderedLessons(): Promise<RenderedLesson[]> {
  return (await (await getDB()).getAll('renderedLessons')).sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  )
}

export async function exportBackup(): Promise<string> {
  const db = await getDB()
  const backup = {
    exportedAt: new Date().toISOString(),
    vocabWords: await db.getAll('vocabWords'),
    sentences: await db.getAll('sentences'),
    listeningEvents: await db.getAll('listeningEvents'),
    settings: {
      lmsSeededAt: await db.get('settings', 'lmsSeededAt'),
    },
  }
  return JSON.stringify(backup, null, 2)
}

export async function importBackup(text: string): Promise<ImportSummary> {
  const backup = JSON.parse(text) as {
    vocabWords?: VocabWord[]
    sentences?: Sentence[]
    listeningEvents?: ListeningEvent[]
  }
  const db = await getDB()
  const tx = db.transaction(['vocabWords', 'sentences', 'listeningEvents'], 'readwrite')
  let created = 0
  let updated = 0

  for (const word of backup.vocabWords ?? []) {
    const existing = await tx.objectStore('vocabWords').get(word.id)
    await tx.objectStore('vocabWords').put(word)
    if (existing) updated += 1
    else created += 1
  }
  for (const sentence of backup.sentences ?? []) {
    await tx.objectStore('sentences').put(sentence)
  }
  for (const event of backup.listeningEvents ?? []) {
    await tx.objectStore('listeningEvents').put(event)
  }

  await tx.done
  return { created, updated, skipped: 0, warnings: [] }
}

async function linkClip(
  tx: {
    objectStore(name: 'vocabWords'): {
      put(value: VocabWord): Promise<IDBValidKey>
    }
    objectStore(name: 'sentences'): {
      put(value: Sentence): Promise<IDBValidKey>
    }
  },
  clip: AudioClip,
  words: VocabWord[],
  sentences: Sentence[],
  manifestEntry?: ClipManifestEntry,
): Promise<number> {
  const label = basenameWithoutExt(clip.path || clip.filename)
  const path = normalizeFilename(clip.path || clip.filename)
  let links = 0

  const manifestWordIds = new Set(manifestEntry?.linkedWordIds ?? [])
  const manifestSentenceId = manifestEntry?.linkedSentenceId

  if (
    clip.type === 'word' ||
    clip.type === 'meaning' ||
    clip.type === 'combined' ||
    clip.type === 'prompt'
  ) {
    for (const word of words) {
      const wordFile = normalizeFilename(word.audioWordFilename)
      const meaningFile = normalizeFilename(word.audioMeaningFilename)
      const wordMatch =
        clip.type === 'word' &&
        (manifestWordIds.has(word.id) ||
          manifestWordIds.has(word.word) ||
          path === wordFile ||
          label === word.word.toLocaleLowerCase())
      const meaningMatch =
        clip.type === 'meaning' &&
        (manifestWordIds.has(word.id) ||
          manifestWordIds.has(word.word) ||
          path === meaningFile ||
          label === word.meaning.toLocaleLowerCase() ||
          label === word.meaning.toLocaleLowerCase().replaceAll(' ', '-'))

      if (wordMatch || meaningMatch) {
        const nextWord = {
          ...word,
          audioWordId: wordMatch ? clip.id : word.audioWordId,
          audioMeaningId: meaningMatch ? clip.id : word.audioMeaningId,
          updatedAt: new Date().toISOString(),
        }
        await tx.objectStore('vocabWords').put(nextWord)
        Object.assign(word, nextWord)
        links += 1
      }
    }
  }

  if (clip.type === 'sentence' || clip.type === 'sentenceMeaning') {
    for (const sentence of sentences) {
      const sentenceFile = normalizeFilename(sentence.audioSentenceFilename)
      const englishFile = normalizeFilename(sentence.audioEnglishFilename)
      const sentenceMatch =
        manifestSentenceId === sentence.id ||
        path === sentenceFile ||
        label === sentence.chinese.toLocaleLowerCase()
      const englishMatch =
        manifestSentenceId === sentence.id ||
        path === englishFile ||
        label === sentence.english.toLocaleLowerCase() ||
        label === sentence.english.toLocaleLowerCase().replaceAll(' ', '-')

      if (clip.type === 'sentence' && sentenceMatch) {
        const nextSentence = {
          ...sentence,
          audioSentenceId: clip.id,
          updatedAt: new Date().toISOString(),
        }
        await tx.objectStore('sentences').put(nextSentence)
        Object.assign(sentence, nextSentence)
        links += 1
      } else if (clip.type === 'sentenceMeaning' && englishMatch) {
        const nextSentence = {
          ...sentence,
          audioEnglishId: clip.id,
          updatedAt: new Date().toISOString(),
        }
        await tx.objectStore('sentences').put(nextSentence)
        Object.assign(sentence, nextSentence)
        links += 1
      }
    }
  }

  return links
}

function detectAudioType(path: string): AudioClip['type'] {
  if (path.includes('/prompts/') || path.startsWith('prompts/')) return 'prompt'
  if (path.includes('/meanings/') || path.startsWith('meanings/')) return 'meaning'
  if (
    path.includes('/sentence_meanings/') ||
    path.startsWith('sentence_meanings/') ||
    path.includes('/sentence-meanings/') ||
    path.startsWith('sentence-meanings/')
  ) {
    return 'sentenceMeaning'
  }
  if (path.includes('/sentences/') || path.startsWith('sentences/')) return 'sentence'
  if (path.includes('/full_lessons/') || path.startsWith('full_lessons/')) {
    return 'fullLesson'
  }
  if (path.includes('/combined/') || path.startsWith('combined/')) return 'combined'
  return 'word'
}

function findPackFile(files: File[], wantedPath: string): File | undefined {
  const wanted = normalizeFilename(wantedPath)
  return files.find((file) => {
    const path = normalizeFilename(readRelativePath(file) || file.name)
    return path === wanted || path.endsWith(`/${wanted}`) || file.name.toLocaleLowerCase() === wanted
  })
}

function resolveManifestFile(files: Map<string, File>, path: string): File | undefined {
  const wanted = normalizeFilename(path)
  if (files.has(wanted)) return files.get(wanted)
  for (const [candidate, file] of files) {
    if (candidate.endsWith(`/${wanted}`)) return file
  }
  return undefined
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Could not fetch ${url}: HTTP ${response.status}`)
  return await response.json()
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Could not fetch ${url}: HTTP ${response.status}`)
  return await response.text()
}

function encodePath(path: string): string {
  return normalizeFilename(path).split('/').map(encodeURIComponent).join('/')
}

function manifestEntryToClip(
  entry: ClipManifestEntry,
  blob: Blob,
  createdAt = new Date().toISOString(),
): AudioClip {
  const filename = entry.path.split('/').pop() || entry.id
  return {
    id: entry.id,
    type: entry.type,
    label: entry.label || entry.text || basenameWithoutExt(entry.path),
    filename,
    path: normalizeFilename(entry.path),
    blob,
    linkedWordIds: entry.linkedWordIds,
    linkedSentenceId: entry.linkedSentenceId,
    manifestId: entry.id,
    text: entry.text,
    language: entry.language,
    provider: entry.provider,
    voice: entry.voice,
    createdAt,
  }
}

function normalizePromptId(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function readRelativePath(file: File): string | undefined {
  return (file as File & { webkitRelativePath?: string }).webkitRelativePath
}

function statusToEvent(status: WordStatus): ListeningEvent['type'] {
  if (status === 'known') return 'mark_known'
  if (status === 'familiar') return 'mark_familiar'
  if (status === 'learning') return 'mark_learning'
  return 'mark_review'
}

function startOfToday(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

export function downloadText(filename: string, text: string, type = 'application/json') {
  const blob = new Blob([text], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export { makeWordId }
