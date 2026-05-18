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
  ClipPack,
  ClipManifestEntry,
  ClipPackManifest,
  DashboardStats,
  FsrsRating,
  HostedClipPack,
  HotkeySettings,
  ImportSummary,
  ListeningEvent,
  RenderedLesson,
  Sentence,
  VocabWord,
  WordStatus,
} from './types'

const DB_NAME = 'chunky-chinese-vocab'
const DB_VERSION = 3

export const DEFAULT_HOTKEYS: HotkeySettings = {
  choiceA: '3',
  choiceB: '4',
  choiceC: '5',
  choiceD: '6',
}

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
  clipPacks: {
    key: string
    value: ClipPack
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
        if (!db.objectStoreNames.contains('clipPacks')) {
          db.createObjectStore('clipPacks', { keyPath: 'id' })
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
  if (count > 0) {
    await ensureLmsPackForExistingWords()
    return 0
  }

  const response = await fetch(`${import.meta.env.BASE_URL}seed/lms-vocab-188.csv`)
  if (!response.ok) return 0
  const rows = parseCsv(await response.text())
  const pack = makeClipPack({
    id: 'lms-188-azure',
    name: 'LMS 188 Azure',
    source: 'hosted',
    language: 'zh-CN',
    description: 'Built-in Legendary Moonlight Sculptor target words.',
    browserTts: false,
  })
  const words = vocabFromCsvRows(rows, pack.id)
  pack.wordCount = words.length
  await db.put('clipPacks', pack)
  await upsertWords(words)
  await db.put('settings', new Date().toISOString(), 'lmsSeededAt')
  await db.put('settings', pack.id, 'activePackId')
  return words.length
}

async function ensureLmsPackForExistingWords(): Promise<void> {
  const db = await getDB()
  const existingPack = await db.get('clipPacks', 'lms-188-azure')
  const activePackId = (await db.get('settings', 'activePackId')) as string | undefined
  if (existingPack && activePackId) return

  const response = await fetch(`${import.meta.env.BASE_URL}seed/lms-vocab-188.csv`)
  if (!response.ok) return
  const rows = parseCsv(await response.text())
  const pack = existingPack ?? makeClipPack({
    id: 'lms-188-azure',
    name: 'LMS 188 Azure',
    source: 'hosted',
    language: 'zh-CN',
    description: 'Built-in Legendary Moonlight Sculptor target words.',
    browserTts: false,
  })
  const words = vocabFromCsvRows(rows, pack.id)
  pack.wordCount = words.length
  await db.put('clipPacks', pack)
  await upsertWords(words)
  if (!activePackId) {
    await db.put('settings', pack.id, 'activePackId')
  }
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

export async function getAllClipPacks(): Promise<ClipPack[]> {
  return (await (await getDB()).getAll('clipPacks')).sort((a, b) =>
    a.name.localeCompare(b.name),
  )
}

export async function getActivePackId(): Promise<string | undefined> {
  return (await (await getDB()).get('settings', 'activePackId')) as string | undefined
}

export async function setActivePackId(packId: string | undefined): Promise<void> {
  const db = await getDB()
  if (packId) await db.put('settings', packId, 'activePackId')
  else await db.delete('settings', 'activePackId')
}

export async function getHotkeys(): Promise<HotkeySettings> {
  const saved = (await (await getDB()).get('settings', 'hotkeys')) as
    | (Partial<HotkeySettings> & {
        answerA?: string
        answerB?: string
        ratingGood?: string
        ratingEasy?: string
      })
    | undefined
  return normalizeHotkeys({
    choiceA: saved?.choiceA ?? saved?.answerA ?? DEFAULT_HOTKEYS.choiceA,
    choiceB: saved?.choiceB ?? saved?.answerB ?? DEFAULT_HOTKEYS.choiceB,
    choiceC: saved?.choiceC ?? saved?.ratingGood ?? DEFAULT_HOTKEYS.choiceC,
    choiceD: saved?.choiceD ?? saved?.ratingEasy ?? DEFAULT_HOTKEYS.choiceD,
  })
}

export async function saveHotkeys(hotkeys: HotkeySettings): Promise<void> {
  await (await getDB()).put('settings', normalizeHotkeys(hotkeys), 'hotkeys')
}

export async function getHostedClipPackIndex(): Promise<HostedClipPack[]> {
  try {
    const packs = (await fetchJson(`${import.meta.env.BASE_URL}clip-packs/index.json`)) as
      | HostedClipPack[]
      | { packs?: HostedClipPack[] }
    return Array.isArray(packs) ? packs : packs.packs ?? []
  } catch {
    return [
      {
        id: 'lms-188-azure',
        name: 'LMS 188 Azure',
        description: 'Legendary Moonlight Sculptor target words with Azure clips.',
        baseUrl: `${import.meta.env.BASE_URL}clip-packs/lms-188-azure`,
        language: 'zh-CN',
      },
    ]
  }
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
      const hasProgress = hasImportedProgress(word)
      await tx.store.put({
        ...existing,
        word: word.word,
        meaning: word.meaning,
        status: hasProgress ? word.status : existing.status,
        lessonNumber: word.lessonNumber ?? existing.lessonNumber,
        tags: word.tags?.length ? word.tags : existing.tags,
        partOfSpeech: word.partOfSpeech || existing.partOfSpeech,
        audioWordFilename: word.audioWordFilename || existing.audioWordFilename,
        audioMeaningFilename: word.audioMeaningFilename || existing.audioMeaningFilename,
        pinyin: word.pinyin || existing.pinyin,
        source: word.source || existing.source,
        notes: word.notes || existing.notes,
        fsrsDueAt: word.fsrsDueAt || existing.fsrsDueAt,
        fsrsIntervalDays: word.fsrsIntervalDays ?? existing.fsrsIntervalDays,
        fsrsEase: word.fsrsEase ?? existing.fsrsEase,
        fsrsRepetitions: word.fsrsRepetitions ?? existing.fsrsRepetitions,
        fsrsLapses: word.fsrsLapses ?? existing.fsrsLapses,
        packIds: unique([...(existing.packIds ?? []), ...(word.packIds ?? [])]),
        lastReviewedAt: word.lastReviewedAt || existing.lastReviewedAt,
        seenCount: hasProgress ? word.seenCount : existing.seenCount,
        correctCount: hasProgress ? word.correctCount : existing.correctCount,
        wrongCount: hasProgress ? word.wrongCount : existing.wrongCount,
        listenedSeconds: hasProgress ? word.listenedSeconds : existing.listenedSeconds,
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
        packIds: unique([...(existing.packIds ?? []), ...(sentence.packIds ?? [])]),
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

export async function importVocabCsv(text: string, packId?: string): Promise<ImportSummary> {
  return await upsertWords(vocabFromCsvRows(parseCsv(text), packId))
}

export async function importSentencesCsv(text: string, packId?: string): Promise<ImportSummary> {
  return await upsertSentences(sentencesFromCsvRows(parseCsv(text), packId))
}

export async function importCsvTtsPack(
  text: string,
  name: string,
  language = 'zh-CN',
): Promise<ImportSummary> {
  const pack = makeClipPack({
    id: makePackId(name),
    name: name.trim() || 'CSV TTS Pack',
    source: 'csv',
    language,
    browserTts: true,
    description: 'CSV-only pack that uses browser text-to-speech when clips are missing.',
  })
  const summary = await importVocabCsv(text, pack.id)
  const db = await getDB()
  pack.wordCount = (await db.getAll('vocabWords')).filter((word) =>
    word.packIds?.includes(pack.id),
  ).length
  pack.sentenceCount = 0
  pack.audioCount = 0
  await db.put('clipPacks', pack)
  await db.put('settings', pack.id, 'activePackId')
  summary.warnings.push(
    'This CSV pack uses browser TTS for missing clips. It is best for foreground practice, not locked-phone background audio.',
  )
  return summary
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

export async function rateWordFsrs(wordId: string, rating: FsrsRating): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['vocabWords', 'listeningEvents'], 'readwrite')
  const word = await tx.objectStore('vocabWords').get(wordId)
  if (!word) {
    await tx.done
    return
  }

  const now = new Date()
  const nowIso = now.toISOString()
  const currentEase = word.fsrsEase ?? 2.5
  const currentInterval = word.fsrsIntervalDays ?? 0
  const currentRepetitions = word.fsrsRepetitions ?? 0
  const currentLapses = word.fsrsLapses ?? 0
  const next = scheduleFsrsReview(
    rating,
    currentEase,
    currentInterval,
    currentRepetitions,
    currentLapses,
    now,
  )

  await tx.objectStore('vocabWords').put({
    ...word,
    status: next.status,
    fsrsDueAt: next.dueAt,
    fsrsIntervalDays: next.intervalDays,
    fsrsEase: next.ease,
    fsrsRepetitions: next.repetitions,
    fsrsLapses: next.lapses,
    lastReviewedAt: nowIso,
    updatedAt: nowIso,
  })
  await tx.objectStore('listeningEvents').put({
    id: `event:${crypto.randomUUID()}`,
    timestamp: nowIso,
    type: 'fsrs_rating',
    itemType: 'word',
    itemId: wordId,
    correct: rating !== 'again',
    rating,
  })
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

export async function importAudioFiles(files: FileList | File[], packId?: string): Promise<ImportSummary> {
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
      packId,
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
  const packId = makePackId(manifest.packName || 'Clip pack')
  const pack = makeClipPack({
    id: packId,
    name: manifest.packName || packId,
    source: 'folder',
    browserTts: false,
  })
  const warnings: string[] = []
  let importedWords = 0
  let importedSentences = 0

  const vocabFile = findPackFile(fileArray, manifest.vocabCsvPath ?? 'vocab.csv')
  if (vocabFile) {
    const summary = await importVocabCsv(await vocabFile.text(), packId)
    importedWords = summary.created + summary.updated
  } else {
    warnings.push('No vocab.csv found in clip pack.')
  }

  const sentencesFile = findPackFile(fileArray, manifest.sentencesCsvPath ?? 'sentences.csv')
  if (sentencesFile) {
    const summary = await importSentencesCsv(await sentencesFile.text(), packId)
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
      packId,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    }
    await tx.objectStore('audioClips').put(clip)
    if (existing) updated += 1
    else created += 1
    linkedAudio += await linkClip(tx, clip, words, sentences, entry)
  }

  await tx.done
  pack.wordCount = (await db.getAll('vocabWords')).filter((word) =>
    word.packIds?.includes(packId),
  ).length
  pack.sentenceCount = (await db.getAll('sentences')).filter((sentence) =>
    sentence.packIds?.includes(packId),
  ).length
  pack.audioCount = created + updated
  await db.put('clipPacks', pack)
  await db.put('settings', manifest, 'lastClipPackManifest')
  await db.put('settings', packId, 'activePackId')
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
  hosted?: Partial<HostedClipPack>,
): Promise<ImportSummary> {
  const base = baseUrl.replace(/\/+$/, '')
  const manifest = (await fetchJson(`${base}/clips_manifest.json`)) as ClipPackManifest
  const packId = hosted?.id ?? makePackId(manifest.packName || base.split('/').pop() || 'Hosted pack')
  const pack = makeClipPack({
    id: packId,
    name: hosted?.name ?? manifest.packName ?? packId,
    source: 'hosted',
    language: hosted?.language,
    description: hosted?.description,
    baseUrl,
    browserTts: false,
  })
  const warnings: string[] = []
  let importedWords = 0
  let importedSentences = 0

  if (manifest.vocabCsvPath) {
    const summary = await importVocabCsv(
      await fetchText(`${base}/${encodePath(manifest.vocabCsvPath)}`),
      packId,
    )
    importedWords = summary.created + summary.updated
  }
  if (manifest.sentencesCsvPath) {
    const summary = await importSentencesCsv(
      await fetchText(`${base}/${encodePath(manifest.sentencesCsvPath)}`),
      packId,
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
    await tx.objectStore('audioClips').put({ ...prepared.clip, packId })
    if (prepared.existed) updated += 1
    else created += 1
    linkedAudio += await linkClip(tx, { ...prepared.clip, packId }, words, sentences, prepared.entry)
  }

  await tx.done
  pack.wordCount = (await db.getAll('vocabWords')).filter((word) =>
    word.packIds?.includes(packId),
  ).length
  pack.sentenceCount = (await db.getAll('sentences')).filter((sentence) =>
    sentence.packIds?.includes(packId),
  ).length
  pack.audioCount = created + updated
  await db.put('clipPacks', pack)
  await db.put('settings', manifest, 'lastClipPackManifest')
  await db.put('settings', packId, 'activePackId')
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
  const activePackId = (await db.get('settings', 'activePackId')) as string | undefined
  const scopedWords = activePackId
    ? words.filter((word) => word.packIds?.includes(activePackId))
    : words
  const start = startOfToday()
  const todayEvents = events.filter((event) => new Date(event.timestamp) >= start)
  const now = Date.now()
  const soon = now + 24 * 60 * 60 * 1000
  const dueWords = scopedWords.filter((word) => isWordDueForReview(word, now))

  return {
    counts: {
      new: scopedWords.filter((word) => word.status === 'new').length,
      learning: scopedWords.filter((word) => word.status === 'learning').length,
      familiar: scopedWords.filter((word) => word.status === 'familiar').length,
      known: scopedWords.filter((word) => word.status === 'known').length,
      review: scopedWords.filter((word) => word.status === 'review').length,
    },
    dueNow: dueWords.length,
    dueSoon: scopedWords.filter((word) => isWordDueSoon(word, now, soon)).length,
    newAvailable: scopedWords.filter((word) => word.status === 'new' && !word.fsrsDueAt).length,
    scheduled: scopedWords.filter((word) => Boolean(word.fsrsDueAt)).length,
    minutesToday:
      todayEvents.reduce((sum, event) => sum + (event.seconds ?? 0), 0) / 60,
    clipsCompletedToday: todayEvents.filter((event) => event.type === 'complete').length,
    knownToday: todayEvents.filter((event) => event.type === 'mark_known').length,
    studyHeatmap: buildStudyHeatmap(events, 84),
    retentionSeries: buildRetentionSeries(scopedWords, events, 12),
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
    clipPacks: await db.getAll('clipPacks'),
    settings: {
      lmsSeededAt: await db.get('settings', 'lmsSeededAt'),
      activePackId: await db.get('settings', 'activePackId'),
      hotkeys: await getHotkeys(),
    },
  }
  return JSON.stringify(backup, null, 2)
}

export async function importBackup(text: string): Promise<ImportSummary> {
  const backup = JSON.parse(text) as {
    vocabWords?: VocabWord[]
    sentences?: Sentence[]
    listeningEvents?: ListeningEvent[]
    clipPacks?: ClipPack[]
    settings?: { activePackId?: string; hotkeys?: HotkeySettings; lmsSeededAt?: string }
  }
  const db = await getDB()
  const tx = db.transaction(['vocabWords', 'sentences', 'listeningEvents', 'clipPacks'], 'readwrite')
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
  for (const pack of backup.clipPacks ?? []) {
    await tx.objectStore('clipPacks').put(pack)
  }

  await tx.done
  if (backup.settings?.activePackId) await db.put('settings', backup.settings.activePackId, 'activePackId')
  if (backup.settings?.hotkeys) await saveHotkeys(backup.settings.hotkeys)
  if (backup.settings?.lmsSeededAt) await db.put('settings', backup.settings.lmsSeededAt, 'lmsSeededAt')
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
          packIds: clip.packId ? unique([...(word.packIds ?? []), clip.packId]) : word.packIds,
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
          packIds: clip.packId
            ? unique([...(sentence.packIds ?? []), clip.packId])
            : sentence.packIds,
          updatedAt: new Date().toISOString(),
        }
        await tx.objectStore('sentences').put(nextSentence)
        Object.assign(sentence, nextSentence)
        links += 1
      } else if (clip.type === 'sentenceMeaning' && englishMatch) {
        const nextSentence = {
          ...sentence,
          audioEnglishId: clip.id,
          packIds: clip.packId
            ? unique([...(sentence.packIds ?? []), clip.packId])
            : sentence.packIds,
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

function makeClipPack(input: {
  id: string
  name: string
  source: ClipPack['source']
  language?: string
  description?: string
  baseUrl?: string
  browserTts?: boolean
}): ClipPack {
  const now = new Date().toISOString()
  return {
    id: input.id,
    name: input.name,
    source: input.source,
    language: input.language,
    description: input.description,
    baseUrl: input.baseUrl,
    browserTts: input.browserTts,
    installedAt: now,
    createdAt: now,
    updatedAt: now,
    wordCount: 0,
    sentenceCount: 0,
    audioCount: 0,
  }
}

function makePackId(name: string): string {
  const slug = name
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9\u3400-\u9fff]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || `pack-${stableHash(name)}`
}

function normalizeHotkeys(hotkeys: HotkeySettings): HotkeySettings {
  return {
    choiceA: normalizeKey(hotkeys.choiceA, DEFAULT_HOTKEYS.choiceA),
    choiceB: normalizeKey(hotkeys.choiceB, DEFAULT_HOTKEYS.choiceB),
    choiceC: normalizeKey(hotkeys.choiceC, DEFAULT_HOTKEYS.choiceC),
    choiceD: normalizeKey(hotkeys.choiceD, DEFAULT_HOTKEYS.choiceD),
  }
}

function normalizeKey(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim()
  return trimmed ? trimmed.toLocaleLowerCase() : fallback
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)))
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

function hasImportedProgress(word: VocabWord): boolean {
  return Boolean(
    word.lastReviewedAt ||
      word.fsrsDueAt ||
      word.fsrsRepetitions ||
      word.fsrsIntervalDays ||
      word.seenCount ||
      word.correctCount ||
      word.wrongCount ||
      word.listenedSeconds,
  )
}

function isWordDueForReview(word: VocabWord, now: number): boolean {
  if (!word.fsrsDueAt) return word.status !== 'known'
  const dueTime = Date.parse(word.fsrsDueAt)
  if (!Number.isFinite(dueTime)) return word.status !== 'known'
  if (word.status === 'known') return dueTime <= now
  return dueTime <= now
}

function isWordDueSoon(word: VocabWord, now: number, soon: number): boolean {
  if (!word.fsrsDueAt) return false
  const dueTime = Date.parse(word.fsrsDueAt)
  return Number.isFinite(dueTime) && dueTime > now && dueTime <= soon
}

function scheduleFsrsReview(
  rating: FsrsRating,
  ease: number,
  intervalDays: number,
  repetitions: number,
  lapses: number,
  now: Date,
): {
  dueAt: string
  intervalDays: number
  ease: number
  repetitions: number
  lapses: number
  status: WordStatus
} {
  const nextRepetitions = rating === 'again' ? 0 : repetitions + 1
  let nextEase = ease
  let nextInterval: number
  let nextLapses = lapses
  let status: WordStatus

  if (rating === 'again') {
    nextEase = Math.max(1.3, ease - 0.2)
    nextInterval = 0
    nextLapses += 1
    status = 'learning'
  } else if (rating === 'hard') {
    nextEase = Math.max(1.3, ease - 0.15)
    nextInterval = repetitions <= 0 ? 1 : Math.max(1, Math.ceil(intervalDays * 1.25))
    status = 'learning'
  } else if (rating === 'good') {
    nextInterval =
      repetitions <= 0 ? 2 : Math.max(intervalDays + 1, Math.ceil(intervalDays * ease))
    status = nextInterval >= 14 ? 'known' : 'familiar'
  } else {
    nextEase = Math.min(3.2, ease + 0.15)
    nextInterval =
      repetitions <= 0
        ? 4
        : Math.max(intervalDays + 2, Math.ceil(intervalDays * (ease + 0.35)))
    status = nextInterval >= 7 ? 'known' : 'familiar'
  }

  const dueAt = new Date(now)
  if (nextInterval === 0) {
    dueAt.setMinutes(dueAt.getMinutes() + 10)
  } else {
    dueAt.setDate(dueAt.getDate() + nextInterval)
  }

  return {
    dueAt: dueAt.toISOString(),
    intervalDays: nextInterval,
    ease: Number(nextEase.toFixed(2)),
    repetitions: nextRepetitions,
    lapses: nextLapses,
    status,
  }
}

function startOfToday(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

function buildStudyHeatmap(events: ListeningEvent[], dayCount: number): DashboardStats['studyHeatmap'] {
  const today = startOfToday()
  const firstDay = new Date(today)
  firstDay.setDate(today.getDate() - (dayCount - 1))
  const byDay = new Map<string, { studySeconds: number; activityCount: number }>()

  for (let offset = 0; offset < dayCount; offset += 1) {
    const day = new Date(firstDay)
    day.setDate(firstDay.getDate() + offset)
    byDay.set(dateKey(day), { studySeconds: 0, activityCount: 0 })
  }

  for (const event of events) {
    const date = new Date(event.timestamp)
    if (Number.isNaN(date.getTime()) || date < firstDay) continue
    const key = dateKey(date)
    const day = byDay.get(key)
    if (!day) continue
    day.studySeconds += event.seconds ?? inferredStudySeconds(event)
    day.activityCount += 1
  }

  return Array.from(byDay, ([date, value]) => ({ date, ...value }))
}

function buildRetentionSeries(
  words: VocabWord[],
  events: ListeningEvent[],
  weekCount: number,
): DashboardStats['retentionSeries'] {
  const wordIds = new Set(words.map((word) => word.id))
  const levelEvents = events
    .filter((event) => wordIds.has(event.itemId))
    .map((event) => ({ ...event, time: Date.parse(event.timestamp) }))
    .filter((event) => Number.isFinite(event.time))
    .sort((a, b) => a.time - b.time)
  const currentLevelEvents = words
    .filter((word) => word.status !== 'new')
    .map((word) => ({
      itemId: word.id,
      time: Date.parse(word.lastReviewedAt || word.updatedAt || word.createdAt),
      level: statusToRetentionLevel(word.status),
    }))
    .filter((event) => Number.isFinite(event.time))
    .sort((a, b) => a.time - b.time)

  const today = startOfToday()
  const points: DashboardStats['retentionSeries'] = []

  for (let offset = weekCount - 1; offset >= 0; offset -= 1) {
    const pointDate = new Date(today)
    pointDate.setDate(today.getDate() - offset * 7)
    pointDate.setHours(23, 59, 59, 999)
    const levels = new Map<string, 'barelyKnown' | 'familiar' | 'wellKnown'>()

    for (const event of levelEvents) {
      if (event.time > pointDate.getTime()) break
      const level = eventToRetentionLevel(event)
      if (level) levels.set(event.itemId, level)
    }

    // Backups can restore current word progress without older rating events. This keeps
    // the chart useful by adding the saved status at its recorded review/update date.
    for (const event of currentLevelEvents) {
      if (event.time > pointDate.getTime()) break
      levels.set(event.itemId, event.level)
    }

    const counts = {
      unknown: Math.max(0, words.length - levels.size),
      barelyKnown: 0,
      familiar: 0,
      wellKnown: 0,
    }
    for (const level of levels.values()) {
      counts[level] += 1
    }
    points.push({ date: dateKey(pointDate), ...counts })
  }

  return points
}

function inferredStudySeconds(event: ListeningEvent): number {
  if (event.type === 'complete') return 3
  if (event.type === 'quiz_answer' || event.type === 'fsrs_rating') return 8
  if (event.type === 'play' || event.type === 'quiz_prompt') return 2
  return 1
}

function eventToRetentionLevel(
  event: ListeningEvent,
): 'barelyKnown' | 'familiar' | 'wellKnown' | undefined {
  if (event.type === 'mark_known') return 'wellKnown'
  if (event.type === 'mark_familiar') return 'familiar'
  if (event.type === 'mark_learning' || event.type === 'mark_review') return 'barelyKnown'
  if (event.type === 'fsrs_rating') {
    if (event.rating === 'easy') return 'wellKnown'
    if (event.rating === 'good') return 'familiar'
    if (event.rating === 'hard' || event.rating === 'again') return 'barelyKnown'
  }
  return undefined
}

function statusToRetentionLevel(status: WordStatus): 'barelyKnown' | 'familiar' | 'wellKnown' {
  if (status === 'known') return 'wellKnown'
  if (status === 'familiar') return 'familiar'
  return 'barelyKnown'
}

function dateKey(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
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
