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
  const { data: shares, error: shareError } = await client.from('study_content_members')
    .select('owner_id').eq('user_id', userId)
  if (shareError) throw shareError
  const ownerIds = [userId, ...(shares ?? []).map(share => share.owner_id as string)]
  const accessibleRows: TextRow[] = []
  // Page explicitly: the library can grow beyond the API's default row limit.
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await client.from('reader_texts').select('user_id,book_id,book_data,updated_at')
      .in('user_id', ownerIds).order('user_id').order('book_id').range(offset, offset + 99)
    if (error) throw error
    const rows = (data ?? []) as TextRow[]
    accessibleRows.push(...rows)
    if (rows.length < 100) break
  }
  // Personal edits take precedence; writes always remain in the learner's account.
  const selected = new Map<string, TextRow>()
  for (const row of accessibleRows) {
    if (!selected.has(row.book_id) || row.user_id === userId) selected.set(row.book_id, row)
  }
  const remote: ReaderTextSyncRecord[] = [...selected.values()].map(row => ({
    bookId: row.book_id, ownerId: userId, updatedAt: row.updated_at, book: row.book_data,
  }))
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
