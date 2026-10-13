import 'fake-indexeddb/auto'
import {describe,it,expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {publish,releases,read,scope,saveProgress,write,progressForRelease} from './storage'
import type {ChinesePackage} from './package'
const pack=JSON.parse(readFileSync('stories/animated/gate-in-the-mist.json','utf8')) as ChinesePackage
describe('personal native story library',()=>{
 it('keeps fixed releases immutable and scopes releases and resume by identity',async()=>{
  const a='a-'+crypto.randomUUID(),b='b-'+crypto.randomUUID();const first=await publish(a,pack),again=await publish(a,pack)
  expect(first).toEqual(again)
  const edited=structuredClone(pack);edited.title='Edited draft';const second=await publish(a,edited)
  expect(second.id).not.toBe(first.id);expect((await releases(a)).find(r=>r.id===first.id)?.pack.title).toBe(pack.title)
  expect(await releases(b)).toEqual([])
  await saveProgress(a,first.id,{steps:[null],quizzes:[],seed:23})
  expect(await read(scope(a)+'progress:'+first.id)).toEqual({steps:[null],quizzes:[],seed:23})
  expect(await read(scope(b)+'progress:'+first.id)).toBeUndefined()
 })
})

it('carries presentation-only resume forward without changing the old attempt or crossing identities',async()=>{
 const id=crypto.randomUUID(),oldId='old-'+id,newId='new-'+id
 const attempt={steps:[null],quizzes:[],seed:17}
 await write('bundled:'+oldId,pack);await saveProgress(id,oldId,attempt)
 const release={id:newId,created:'',pack,resumeFrom:oldId}
 expect(await progressForRelease(id,release)).toEqual(attempt)
 expect(await progressForRelease('other-'+id,release)).toBeUndefined()
 expect(await progressForRelease(id,{...release,pack:{...pack,script:pack.script+'\n# changed'}})).toBeUndefined()
 await saveProgress(id,newId,{...attempt,steps:[null,null]})
 expect((await progressForRelease(id,release))?.steps).toEqual([null,null])
 expect(await read(scope(id)+'progress:'+oldId)).toEqual(attempt)
})
