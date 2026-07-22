import { getDB } from './db'
import type { ListeningEvent, ReaderBook, ReaderProgress, ReaderSession } from './types'

export interface DataHealthReport {
  checkedAt: string
  healthy: boolean
  issueCount: number
  invalidStudyEvents: number
  duplicateStudyEvents: number
  implausibleReaderSessions: number
  invalidReaderProgress: number
  details: string[]
}

export interface DataHealthRepairResult {
  repairedStudyEvents: number
  removedDuplicateEvents: number
  repairedReaderSessions: number
  repairedReaderProgress: number
}

export type DataHealthRecords = {
  events: ListeningEvent[]
  sessions: ReaderSession[]
  progress: ReaderProgress[]
  books: ReaderBook[]
}

export async function runDataHealthCheck(): Promise<DataHealthReport> {
  return analyzeDataHealthRecords(await loadDataHealthRecords())
}

export function analyzeDataHealthRecords(records: DataHealthRecords): DataHealthReport {
  const duplicateIds = duplicateStudyEventIds(records.events)
  const invalidStudyEvents = records.events.filter(studyEventNeedsRepair).length
  const implausibleReaderSessions = records.sessions.filter(readerSessionNeedsRepair).length
  const invalidReaderProgress = records.progress.filter((item) => readerProgressNeedsRepair(item, records.books)).length
  const issueCount = invalidStudyEvents + duplicateIds.size + implausibleReaderSessions + invalidReaderProgress
  const details: string[] = []
  if (invalidStudyEvents) details.push(`${invalidStudyEvents} study event${invalidStudyEvents === 1 ? '' : 's'} had invalid or over-limit timing.`)
  if (duplicateIds.size) details.push(`${duplicateIds.size} duplicate study event${duplicateIds.size === 1 ? '' : 's'} found.`)
  if (implausibleReaderSessions) details.push(`${implausibleReaderSessions} Reader session${implausibleReaderSessions === 1 ? '' : 's'} had implausible active time.`)
  if (invalidReaderProgress) details.push(`${invalidReaderProgress} saved Reader position${invalidReaderProgress === 1 ? '' : 's'} needed repair.`)
  if (!details.length) details.push('No timing, duplicate-event, or Reader-position problems found.')
  return {
    checkedAt: new Date().toISOString(),
    healthy: issueCount === 0,
    issueCount,
    invalidStudyEvents,
    duplicateStudyEvents: duplicateIds.size,
    implausibleReaderSessions,
    invalidReaderProgress,
    details,
  }
}

export async function repairDataHealth(): Promise<DataHealthRepairResult> {
  const records = await loadDataHealthRecords()
  const db = await getDB()
  const duplicateIds = duplicateStudyEventIds(records.events)
  let repairedStudyEvents = 0
  let repairedReaderSessions = 0
  let repairedReaderProgress = 0

  const eventTx = db.transaction('listeningEvents', 'readwrite')
  for (const event of records.events) {
    if (duplicateIds.has(event.id)) {
      await eventTx.store.delete(event.id)
      continue
    }
    if (!studyEventNeedsRepair(event)) continue
    const seconds = normalizedStudyEventSeconds(event)
    await eventTx.store.put({ ...event, seconds })
    repairedStudyEvents += 1
  }
  await eventTx.done

  const sessionTx = db.transaction('readerSessions', 'readwrite')
  for (const session of records.sessions) {
    if (!readerSessionNeedsRepair(session)) continue
    await sessionTx.store.put({
      ...session,
      activeSeconds: plausibleReaderSessionSeconds(session),
      updatedAt: new Date().toISOString(),
    })
    repairedReaderSessions += 1
  }
  await sessionTx.done

  const progressTx = db.transaction('readerProgress', 'readwrite')
  for (const item of records.progress) {
    const book = records.books.find((candidate) => candidate.id === item.bookId && candidate.packId === item.packId)
    if (!book) {
      await progressTx.store.delete(item.id)
      repairedReaderProgress += 1
      continue
    }
    const sentenceCount = book.stories.reduce((sum, story) => sum + story.sentences.length, 0)
    const boundedIndex = Math.min(Math.max(0, Math.round(item.sentenceIndex || 0)), Math.max(0, sentenceCount - 1))
    if (boundedIndex !== item.sentenceIndex) {
      await progressTx.store.put({ ...item, sentenceIndex: boundedIndex, updatedAt: new Date().toISOString() })
      repairedReaderProgress += 1
    }
  }
  await progressTx.done

  return {
    repairedStudyEvents,
    removedDuplicateEvents: duplicateIds.size,
    repairedReaderSessions,
    repairedReaderProgress,
  }
}

async function loadDataHealthRecords(): Promise<DataHealthRecords> {
  const db = await getDB()
  const [events, sessions, progress, books] = await Promise.all([
    db.getAll('listeningEvents'),
    db.getAll('readerSessions'),
    db.getAll('readerProgress'),
    db.getAll('readerBooks'),
  ])
  return { events, sessions, progress, books }
}

function studyEventNeedsRepair(event: ListeningEvent): boolean {
  const seconds = event.seconds
  if (seconds !== undefined && (!Number.isFinite(seconds) || seconds < 0)) return true
  return event.type === 'fsrs_rating' && event.source === 'flashcards' && (seconds ?? 0) > 60
}

function normalizedStudyEventSeconds(event: ListeningEvent): number {
  const seconds = Number.isFinite(event.seconds) ? Math.max(0, event.seconds ?? 0) : 0
  return event.type === 'fsrs_rating' && event.source === 'flashcards' ? Math.min(60, seconds) : seconds
}

function duplicateStudyEventIds(events: ListeningEvent[]): Set<string> {
  const seen = new Set<string>()
  const duplicates = new Set<string>()
  for (const event of [...events].sort((a, b) => a.id.localeCompare(b.id))) {
    const signature = [
      event.timestamp,
      event.type,
      event.itemType,
      event.itemId,
      event.source ?? '',
      event.rating ?? '',
      event.seconds ?? '',
      event.sessionId ?? '',
    ].join('|')
    if (seen.has(signature)) duplicates.add(event.id)
    else seen.add(signature)
  }
  return duplicates
}

function readerSessionNeedsRepair(session: ReaderSession): boolean {
  return !Number.isFinite(session.activeSeconds) || session.activeSeconds < 0 || session.activeSeconds > plausibleReaderSessionSeconds(session)
}

function plausibleReaderSessionSeconds(session: ReaderSession): number {
  const startedAt = Date.parse(session.startedAt)
  const updatedAt = Date.parse(session.updatedAt)
  if (!Number.isFinite(startedAt) || !Number.isFinite(updatedAt) || updatedAt < startedAt) return 0
  return Math.max(0, Math.min(12 * 60 * 60, Math.ceil((updatedAt - startedAt) / 1000) + 60))
}

function readerProgressNeedsRepair(item: ReaderProgress, books: ReaderBook[]): boolean {
  const book = books.find((candidate) => candidate.id === item.bookId && candidate.packId === item.packId)
  if (!book) return true
  const sentenceCount = book.stories.reduce((sum, story) => sum + story.sentences.length, 0)
  return !Number.isFinite(item.sentenceIndex) || item.sentenceIndex < 0 || item.sentenceIndex >= Math.max(1, sentenceCount)
}
