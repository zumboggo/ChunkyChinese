import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { openDB } from 'idb'
import { saveGeneratedReaderBook, getAllReaderBooks, getReaderTextSyncRecords, deleteGeneratedReaderBook } from './db'
import { syncReaderTexts } from './readerTextCloud'
import type { ReaderBook } from './types'
vi.mock('./supabaseSync', () => ({downloadPrivateContent: vi.fn()}))
const book: ReaderBook = {id:'cloud-example',packId:'generated-stories',title:'School',book:1,chapterStart:1,chapterEnd:1,library:{textLength:'short',category:'School',temporary:false},stories:[]}
const remote = new Map<string, Record<string, unknown>>()
let fail = false
const shares = new Map<string, string[]>()
const client = {from:(table:string)=>({
 select:()=> table === 'study_content_members'
  ? {eq:async (_key:string,user:string)=>({data:(shares.get(user)??[]).map(owner_id=>({owner_id})),error:fail?new Error('Offline'):null})}
  : {in:(_key:string,users:string[])=>({order:()=>({order:()=>({range:async()=>({data:[...remote.values()].filter(row=>users.includes(row.user_id as string)),error:fail?new Error('Offline'):null})})})})},
 upsert:(row:Record<string,unknown>)=>({select:()=>({single:async()=>{if(fail)return {error:new Error('Offline')}; remote.set(String(row.user_id)+':'+String(row.book_id),structuredClone(row)); return {data:row,error:null}}})}),
})} as unknown as SupabaseClient
async function clearDevice(){
 const db=await openDB('chunky-chinese-vocab');
 for(const name of ['readerBooks','readerPacks','settings']) if(db.objectStoreNames.contains(name))await db.clear(name)
 db.close()
}
beforeEach(async()=>{await saveGeneratedReaderBook({...book,id:'init'});await clearDevice();remote.clear();shares.clear();fail=false})
describe('private reader text sync',()=>{
 it('uploads a permanent text and restores it, with category, on a fresh device',async()=>{
  await saveGeneratedReaderBook(book)
  expect(await syncReaderTexts(client,'alice')).toMatchObject({pushedReaderTexts:1})
  await clearDevice()
  expect(await syncReaderTexts(client,'alice')).toMatchObject({pulledReaderTexts:1})
  expect((await getAllReaderBooks()).find(b=>b.id===book.id)).toEqual(book)
  expect(await syncReaderTexts(client,'alice')).toEqual({pushedReaderTexts:0,pulledReaderTexts:0})
 })
 it('syncs edits in both directions and preserves a local deletion against remote content',async()=>{
  await saveGeneratedReaderBook(book);await syncReaderTexts(client,'alice')
  const key='alice:'+book.id
  remote.set(key,{...remote.get(key),book_data:{...book,title:'Updated elsewhere'},updated_at:'2099-01-01T00:00:00.000Z'})
  await syncReaderTexts(client,'alice')
  expect((await getAllReaderBooks()).find(b=>b.id===book.id)?.title).toBe('Updated elsewhere')
  await saveGeneratedReaderBook({...book,title:'Updated here'})
  await syncReaderTexts(client,'alice')
  expect((remote.get(key)?.book_data as ReaderBook).title).toBe('Updated here')
  await deleteGeneratedReaderBook(book.id)
  await syncReaderTexts(client,'alice')
  expect(remote.get(key)?.book_data).toBeNull()
 })
 it('never uploads temporary text until promoted',async()=>{
  await saveGeneratedReaderBook({...book,library:{...book.library!,temporary:true}})
  await syncReaderTexts(client,'alice');expect(remote.size).toBe(0)
  await saveGeneratedReaderBook(book)
  await syncReaderTexts(client,'alice');expect(remote.size).toBe(1)
 })
 it('does not copy Alice’s cached texts to Bob’s account',async()=>{
  await saveGeneratedReaderBook(book);await syncReaderTexts(client,'alice')
  await syncReaderTexts(client,'bob')
  expect(await getReaderTextSyncRecords('bob')).toEqual([])
  expect(remote.has('bob:'+book.id)).toBe(false)
 })
 it('retains offline saves for retry and propagates deletion without resurrection',async()=>{
  await saveGeneratedReaderBook(book);fail=true
  await expect(syncReaderTexts(client,'alice')).rejects.toThrow('Offline')
  expect((await getAllReaderBooks()).some(b=>b.id===book.id)).toBe(true)
  fail=false;await syncReaderTexts(client,'alice')
  await deleteGeneratedReaderBook(book.id);await syncReaderTexts(client,'alice')
  expect(remote.get('alice:'+book.id)?.book_data).toBeNull()
  await clearDevice();await saveGeneratedReaderBook(book) // stale offline device
  await syncReaderTexts(client,'alice')
  expect((await getAllReaderBooks()).some(b=>b.id===book.id)).toBe(false)
 })
})

it('pulls only an explicitly shared library and keeps edits in the recipient account',async()=>{
 remote.set('alice:'+book.id,{user_id:'alice',book_id:book.id,book_data:book,updated_at:'2026-01-01T00:00:00Z'})
 remote.set('other:private',{user_id:'other',book_id:'private',book_data:{...book,id:'private'},updated_at:'2026-01-01T00:00:00Z'})
 shares.set('bob',['alice'])
 await syncReaderTexts(client,'bob')
 expect((await getAllReaderBooks()).map(b=>b.id)).toContain(book.id)
 expect((await getAllReaderBooks()).map(b=>b.id)).not.toContain('private')
 await saveGeneratedReaderBook({...book,title:'Bob edit'})
 await syncReaderTexts(client,'bob')
 expect((remote.get('alice:'+book.id)?.book_data as ReaderBook).title).toBe('School')
 expect((remote.get('bob:'+book.id)?.book_data as ReaderBook).title).toBe('Bob edit')
})
