import type { SupabaseClient } from '@supabase/supabase-js'
import { applyReaderTextSyncRecord, getReaderTextSyncRecords } from './db'
import type { ReaderBook, ReaderTextSyncRecord } from './types'

type TextRow = { user_id: string; book_id: string; book_data: ReaderBook | null; updated_at: string }
export function readerTextNeedsPush(local: ReaderTextSyncRecord, remote?: ReaderTextSyncRecord): boolean {
  if (!remote) return true
  if (!remote.book) return false // Deletions must not be resurrected by an offline device.
  return !local.book || Date.parse(local.updatedAt) > Date.parse(remote.updatedAt)
}

export async function syncReaderTexts(client: SupabaseClient, userId: string) {
  const remote: ReaderTextSyncRecord[] = []
  // Page explicitly: the library can grow beyond the API's default row limit.
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await client.from('reader_texts').select('user_id,book_id,book_data,updated_at')
      .eq('user_id', userId).order('book_id').range(offset, offset + 99)
    if (error) throw error
    const rows = (data ?? []) as TextRow[]
    remote.push(...rows.map(row => ({bookId: row.book_id, ownerId: userId, updatedAt: row.updated_at, book: row.book_data})))
    if (rows.length < 100) break
  }
  let local = await getReaderTextSyncRecords(userId)
  let pulled = 0
  for (const record of remote) {
    const existing = local.find(item => item.bookId === record.bookId)
    if (!existing || (existing.book && (!record.book || Date.parse(record.updatedAt) > Date.parse(existing.updatedAt)))) {
      await applyReaderTextSyncRecord(record)
      pulled++
    }
  }
  local = await getReaderTextSyncRecords(userId)
  let pushed = 0
  for (const record of local) {
    if (!readerTextNeedsPush(record, remote.find(item => item.bookId === record.bookId))) continue
    const { data, error } = await client.from('reader_texts').upsert({user_id: userId, book_id: record.bookId, book_data: record.book, updated_at: record.updatedAt}, {onConflict: 'user_id,book_id'})
      .select('user_id,book_id,book_data,updated_at').single()
    if (error) throw error
    // The server keeps newer changes/deletions if another device raced this save.
    const row = data as TextRow
    await applyReaderTextSyncRecord({bookId: row.book_id, ownerId: userId, updatedAt: row.updated_at, book: row.book_data})
    pushed++
  }
  return { pushedReaderTexts: pushed, pulledReaderTexts: pulled }
}
