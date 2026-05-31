import { createClient, type Session, type User } from '@supabase/supabase-js'
import {
  getAllListeningEvents,
  getAllWords,
  getSyncMetadata,
  putSyncedListeningEvents,
  putSyncedWords,
  saveSyncMetadata,
} from './db'
import type { ListeningEvent, VocabWord } from './types'

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

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    })
  : null

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

  const [remoteWords, remoteEvents, localWords, localEvents, metadata] = await Promise.all([
    fetchRemoteWords(),
    fetchRemoteEvents(),
    getAllWords(),
    getAllListeningEvents(),
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

  const latestLocalWords = await getAllWords()
  const latestLocalEvents = await getAllListeningEvents()
  const remoteWordIds = new Set(syncableRemoteWords.map((row) => row.word_id))
  const remoteEventIds = new Set(remoteEvents.map((row) => row.event_id))
  const wordRows = latestLocalWords
    .filter(isSyncableVocabWord)
    .filter((word) => shouldPushWord(word, syncableRemoteWords.find((row) => row.word_id === word.id)))
    .map((word) => wordToRow(user.id, word))
  const eventRows = latestLocalEvents
    .filter((event) => !remoteEventIds.has(event.id))
    .map((event) => eventToRow(user.id, event))

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

  const syncedAt = new Date().toISOString()
  await saveSyncMetadata({ userId: user.id, lastSyncedAt: syncedAt })

  return {
    pushedWords: wordRows.filter((row) => !remoteWordIds.has(row.word_id)).length,
    pulledWords: pulledWords.length,
    pushedEvents: eventRows.length,
    pulledEvents: remoteOnlyEvents.length,
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
