import 'fake-indexeddb/auto'
import { describe, expect, it, vi } from 'vitest'
import { normalizeReaderCategory, readerPlacement } from './readerOrganization'
import { seedReaderBooksIfEmpty, getAllReaderBooks, saveGeneratedReaderBook, deleteGeneratedReaderBook } from './db'
import type { ReaderBook } from './types'
vi.mock('./supabaseSync', () => ({ downloadPrivateContent: vi.fn().mockRejectedValue(new Error('offline fixture')) }))
const book = (id: string, packId = 'generated-stories'): ReaderBook => ({id,packId,title:'Example',book:1,chapterStart:1,chapterEnd:1,stories:[]})
describe('reader organization', () => {
 it('groups imported series and category aliases together', () => {
  expect(readerPlacement(book('lms-1','lms-books')).category).toBe(normalizeReaderCategory('LMS'))
  expect(readerPlacement(book('hp-1','harry-potter-graded')).category).toBe(normalizeReaderCategory('Boy who lived'))
  expect(readerPlacement({...book('custom'),library:{textLength:'short',category:' School ',temporary:false}})).toEqual({textLength:'short',category:'School',temporary:false})
 })
 it('preserves permanent local texts when refreshing hosted packs offline', async () => {
  const permanent = book('preserve-test')
  await saveGeneratedReaderBook(permanent)
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
  try {
    await seedReaderBooksIfEmpty()
    expect((await getAllReaderBooks()).find(b => b.id === permanent.id)).toEqual(permanent)
  } finally { warning.mockRestore(); await deleteGeneratedReaderBook(permanent.id) }
 })
 it('keeps temporary content out of persistent book storage and allows promotion', async () => {
  const temporary = {...book('temporary-test'),library:{textLength:'short' as const,category:'School',temporary:true}}
  await saveGeneratedReaderBook(temporary)
  expect((await getAllReaderBooks()).find(b=>b.id===temporary.id)).toEqual(temporary)
  const db = await new Promise<IDBDatabase>((resolve,reject)=>{const req=indexedDB.open('chunky-chinese-vocab');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})
  const read = () => new Promise((resolve,reject)=>{const req=db.transaction('readerBooks').objectStore('readerBooks').get(temporary.id);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})
  expect(await read()).toBeUndefined()
  await saveGeneratedReaderBook({...temporary,library:{...temporary.library,temporary:false}})
  expect(await read()).toMatchObject({id:temporary.id,library:{temporary:false}})
  expect((await getAllReaderBooks()).filter(b=>b.id===temporary.id)).toHaveLength(1)
  await deleteGeneratedReaderBook(temporary.id)
  expect(await read()).toBeUndefined()
  db.close()
 })
})
