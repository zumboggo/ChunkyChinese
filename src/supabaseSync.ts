import { createClient, type Session, type User } from '@supabase/supabase-js'
import {
  getAllReaderProgress,
  getAllListeningEvents,
  getAllWords,
  getSyncMetadata,
  putSyncedReaderProgress,
  putSyncedListeningEvents,
  putSyncedWords,
  saveSyncMetadata,
} from './db'
import type { ListeningEvent, ReaderProgress, VocabWord } from './types'
import { effectiveWordDeckIds, uniqueDeckIds } from './flashcardDecks'
import { PRIVATE_CONTENT_BUCKET } from './contentCatalog'

const FALLBACK_SUPABASE_URL = 'https://nvrofeaaewwdeefxtmqu.supabase.co'
const FALLBACK_SUPABASE_ANON_KEY = 'sb_publishable_YaSTM-n-eBSDWPkY4IigOg_vFHmdYSB'

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL?.trim() || FALLBACK_SUPABASE_URL
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || FALLBACK_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

export type CloudSyncStatus =
  | 'unconfigured'
  | 'signed-out'
  | 'idle'
  | 'syncing'
  | 'synced'
  | 'offline'
  | 'error'

export interface CloudAuthState {
  configured: boolean
  session: Session | null
  user: User | null
}

export interface CloudSyncResult {
  pushedWords: number
  pulledWords: number
  pushedEvents: number
  pulledEvents: number
  pushedReaderProgress: number
  pulledReaderProgress: number
  syncedAt: string
}

type WordProgressRow = {
  user_id: string
  word_id: string
  word_data: VocabWord
  updated_at: string
  user_edited_at: string | null
}

type ReviewEventRow = {
  user_id: string
  event_id: string
  event_data: ListeningEvent
  timestamp: string
}

type ReaderProgressRow = {
  user_id: string
  progress_id: string
  progress_data: ReaderProgress
  updated_at: string
}

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    })
  : null

export async function downloadPrivateContent(path: string): Promise<Blob> {
  if (!supabase) throw new Error('Supabase is not configured yet.')
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!user) throw new Error('Sign in before downloading private study content.')
  const { data, error } = await supabase.storage.from(PRIVATE_CONTENT_BUCKET).download(path)
  if (error) throw error
  return data
}

export async function getCloudAuthState(): Promise<CloudAuthState> {
  if (!supabase) return { configured: false, session: null, user: null }
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return {
    configured: true,
    session: data.session,
    user: data.session?.user ?? null,
  }
}

export function onCloudAuthChange(
  callback: (state: CloudAuthState) => void,
): () => void {
  if (!supabase) {
    callback({ configured: false, session: null, user: null })
    return () => undefined
  }

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback({
      configured: true,
      session,
      user: session?.user ?? null,
    })
  })
  return () => data.subscription.unsubscribe()
}

export async function signInWithGoogle(): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured yet.')
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: authRedirectUrl() },
  })
  if (error) throw error
}

export async function signInWithMagicLink(email: string): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured yet.')
  const trimmedEmail = email.trim()
  if (!trimmedEmail) throw new Error('Enter an email address first.')
  const { error } = await supabase.auth.signInWithOtp({
    email: trimmedEmail,
    options: { emailRedirectTo: authRedirectUrl() },
  })
  if (error) throw error
}

export async function signOutOfCloud(): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

let activeSync: Promise<CloudSyncResult> | null = null
let readerProgressSyncAvailable = true

export async function syncNow(): Promise<CloudSyncResult> {
  if (activeSync) return activeSync
  activeSync = runSyncNow().finally(() => {
    activeSync = null
  })
  return activeSync
}

async function runSyncNow(): Promise<CloudSyncResult> {
  if (!supabase) throw new Error('Supabase is not configured yet.')
  if (!navigator.onLine) throw new Error('This device is offline. Changes are queued locally.')

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  const user = userData.user
  if (!user) throw new Error('Sign in before syncing.')

  const [remoteWords, remoteEvents, remoteReaderProgress, localWords, localEvents, localReaderProgress, metadata] = await Promise.all([
    fetchRemoteWords(),
    fetchRemoteEvents(),
    fetchRemoteReaderProgress(),
    getAllWords(),
    getAllListeningEvents(),
    getAllReaderProgress(),
    getSyncMetadata(),
  ])

  const syncableRemoteWords = remoteWords.filter((row) => isSyncableVocabWord(row.word_data))
  const syncableLocalWords = localWords.filter(isSyncableVocabWord)
  const localWordMap = new Map(syncableLocalWords.map((word) => [word.id, word]))
  const mergedWords = mergeRemoteWords(localWordMap, syncableRemoteWords, metadata.userId !== user.id)
  const pulledWords = mergedWords.filter((word) => localWordMap.get(word.id) !== word)
  await putSyncedWords(pulledWords)

  const localEventIds = new Set(localEvents.map((event) => event.id))
  const remoteOnlyEvents = remoteEvents
    .map((row) => row.event_data)
    .filter((event) => !localEventIds.has(event.id))
  await putSyncedListeningEvents(remoteOnlyEvents)

  const localReaderProgressMap = new Map(localReaderProgress.map((progress) => [progress.id, progress]))
  const pulledReaderProgress = readerProgressSyncAvailable
    ? remoteReaderProgress
        .map((row) => normalizeRemoteReaderProgress(row.progress_data, row.updated_at))
        .filter((remote) => {
          const local = localReaderProgressMap.get(remote.id)
          return !local || timeValue(remote.updatedAt) > timeValue(local.updatedAt)
        })
    : []
  await putSyncedReaderProgress(pulledReaderProgress)

  const latestLocalWords = await getAllWords()
  const latestLocalEvents = await getAllListeningEvents()
  const latestLocalReaderProgress = await getAllReaderProgress()
  const remoteWordIds = new Set(syncableRemoteWords.map((row) => row.word_id))
  const remoteEventIds = new Set(remoteEvents.map((row) => row.event_id))
  const remoteReaderProgressIds = new Set(remoteReaderProgress.map((row) => row.progress_id))
  const wordRows = latestLocalWords
    .filter(isSyncableVocabWord)
    .filter((word) => shouldPushWord(word, syncableRemoteWords.find((row) => row.word_id === word.id)))
    .map((word) => wordToRow(user.id, word))
  const eventRows = latestLocalEvents
    .filter((event) => !remoteEventIds.has(event.id))
    .map((event) => eventToRow(user.id, event))
  const readerProgressRows = readerProgressSyncAvailable
    ? latestLocalReaderProgress
        .filter((progress) => shouldPushReaderProgress(progress, remoteReaderProgress.find((row) => row.progress_id === progress.id)))
        .map((progress) => readerProgressToRow(user.id, progress))
    : []

  if (wordRows.length > 0) {
    const { error } = await supabase.from('word_progress').upsert(wordRows, {
      onConflict: 'user_id,word_id',
    })
    if (error) throw error
  }
  if (eventRows.length > 0) {
    const { error } = await supabase.from('review_events').upsert(eventRows, {
      onConflict: 'user_id,event_id',
    })
    if (error) throw error
  }
  if (readerProgressRows.length > 0) {
    const { error } = await supabase.from('reader_progress').upsert(readerProgressRows, {
      onConflict: 'user_id,progress_id',
    })
    if (error) throw error
  }

  const syncedAt = new Date().toISOString()
  await saveSyncMetadata({ userId: user.id, lastSyncedAt: syncedAt })

  return {
    pushedWords: wordRows.filter((row) => !remoteWordIds.has(row.word_id)).length,
    pulledWords: pulledWords.length,
    pushedEvents: eventRows.length,
    pulledEvents: remoteOnlyEvents.length,
    pushedReaderProgress: readerProgressRows.filter((row) => !remoteReaderProgressIds.has(row.progress_id)).length,
    pulledReaderProgress: pulledReaderProgress.length,
    syncedAt,
  }
}

async function fetchRemoteWords(): Promise<WordProgressRow[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('word_progress')
    .select('user_id, word_id, word_data, updated_at, user_edited_at')
  if (error) throw error
  return (data ?? []) as WordProgressRow[]
}

async function fetchRemoteEvents(): Promise<ReviewEventRow[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('review_events')
    .select('user_id, event_id, event_data, timestamp')
  if (error) throw error
  return (data ?? []) as ReviewEventRow[]
}

async function fetchRemoteReaderProgress(): Promise<ReaderProgressRow[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('reader_progress')
    .select('user_id, progress_id, progress_data, updated_at')
  if (error) {
    if (isMissingReaderProgressTable(error)) {
      readerProgressSyncAvailable = false
      return []
    }
    throw error
  }
  readerProgressSyncAvailable = true
  return (data ?? []) as ReaderProgressRow[]
}

function mergeRemoteWords(
  localWords: Map<string, VocabWord>,
  remoteRows: WordProgressRow[],
  isFirstSyncForUser: boolean,
): VocabWord[] {
  const merged: VocabWord[] = []
  for (const row of remoteRows) {
    const remote = normalizeRemoteWord(row.word_data, row.updated_at)
    const local = localWords.get(row.word_id)
    if (!local) {
      merged.push(remote)
      continue
    }

    const localHasProgress = hasMeaningfulProgress(local)
    const remoteEditedAt = timeValue(remote.userEditedAt)
    const localEditedAt = timeValue(local.userEditedAt)
    const remoteUpdatedAt = timeValue(remote.updatedAt)
    const localUpdatedAt = timeValue(local.updatedAt)

    if ((isFirstSyncForUser && !localHasProgress) || remoteUpdatedAt > localUpdatedAt) {
      merged.push({
        ...local,
        ...remote,
        packIds: unique([...(local.packIds ?? []), ...(remote.packIds ?? [])]),
        deckIds: uniqueDeckIds([...effectiveWordDeckIds(local), ...effectiveWordDeckIds(remote)]),
      })
    } else if (remoteEditedAt > localEditedAt) {
      merged.push({
        ...local,
        word: remote.word,
        pinyin: remote.pinyin,
        meaning: remote.meaning,
        notes: remote.notes,
        userEditedAt: remote.userEditedAt,
        updatedAt: newerIso(local.updatedAt, remote.updatedAt),
      })
    }
  }
  return merged
}

function shouldPushWord(word: VocabWord, remote: WordProgressRow | undefined): boolean {
  if (!remote) return true
  return timeValue(word.updatedAt) > timeValue(remote.updated_at)
}

function wordToRow(userId: string, word: VocabWord): WordProgressRow {
  return {
    user_id: userId,
    word_id: word.id,
    word_data: stripLocalAudioIds(word),
    updated_at: word.updatedAt,
    user_edited_at: word.userEditedAt ?? null,
  }
}

function eventToRow(userId: string, event: ListeningEvent): ReviewEventRow {
  return {
    user_id: userId,
    event_id: event.id,
    event_data: event,
    timestamp: event.timestamp,
  }
}

function readerProgressToRow(userId: string, progress: ReaderProgress): ReaderProgressRow {
  return {
    user_id: userId,
    progress_id: progress.id,
    progress_data: progress,
    updated_at: progress.updatedAt,
  }
}

function shouldPushReaderProgress(
  progress: ReaderProgress,
  remote: ReaderProgressRow | undefined,
): boolean {
  if (!remote) return true
  return timeValue(progress.updatedAt) > timeValue(remote.updated_at)
}

function normalizeRemoteReaderProgress(
  progress: ReaderProgress,
  fallbackUpdatedAt: string,
): ReaderProgress {
  return {
    ...progress,
    updatedAt: progress.updatedAt || fallbackUpdatedAt,
  }
}

function normalizeRemoteWord(word: VocabWord, fallbackUpdatedAt: string): VocabWord {
  return {
    ...word,
    updatedAt: word.updatedAt || fallbackUpdatedAt,
    createdAt: word.createdAt || fallbackUpdatedAt,
    seenCount: word.seenCount ?? 0,
    correctCount: word.correctCount ?? 0,
    wrongCount: word.wrongCount ?? 0,
    listenedSeconds: word.listenedSeconds ?? 0,
  }
}

function stripLocalAudioIds(word: VocabWord): VocabWord {
  return {
    ...word,
    audioWordId: undefined,
    audioMeaningId: undefined,
  }
}

function hasMeaningfulProgress(word: VocabWord): boolean {
  return Boolean(
    word.userEditedAt ||
      word.activeRecallPriorityAt ||
      word.lastReviewedAt ||
      word.fsrsDueAt ||
      word.fsrsRepetitions ||
      word.fsrsLapses ||
      word.fsrsState ||
      word.seenCount ||
      word.correctCount ||
      word.wrongCount ||
      word.listenedSeconds,
  )
}

function isSyncableVocabWord(word: VocabWord): boolean {
  return hasHanText(word.word) || hasHanText(word.meaning)
}

function hasHanText(value: string | undefined): boolean {
  return /[\u3400-\u9fff]/u.test(value ?? '')
}

function authRedirectUrl(): string {
  return new URL(import.meta.env.BASE_URL, window.location.origin).toString()
}

function timeValue(value: string | undefined): number {
  if (!value) return 0
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function newerIso(first: string | undefined, second: string | undefined): string {
  return timeValue(first) >= timeValue(second)
    ? first ?? second ?? new Date().toISOString()
    : second ?? first ?? new Date().toISOString()
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)))
}

function isMissingReaderProgressTable(error: { code?: string; message?: string }): boolean {
  return error.code === '42P01' || /reader_progress|relation .* does not exist/iu.test(error.message ?? '')
}
