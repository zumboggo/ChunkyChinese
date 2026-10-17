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

it('resumes visual-only staging revisions but refuses changes to dialogue or branches',async()=>{
 const id=crypto.randomUUID(),oldId='visual-old-'+id,attempt={steps:[null],quizzes:[],seed:9}
 await write('bundled:'+oldId,pack);await saveProgress(id,oldId,attempt)
 const updated={...pack,script:pack.script.replace('story 2','story 2\ncamera wide')}
 const release={id:'visual-new-'+id,created:'',pack:updated,resumeFrom:oldId}
 expect(await progressForRelease(id,release)).toEqual(attempt)
 expect(await progressForRelease(id,{...release,pack:{...updated,script:updated.script+'\nI: A new line.'}})).toBeUndefined()
 expect(await read(scope(id)+'progress:'+oldId)).toEqual(attempt)
})

it('tracks the last played release with its progress, independently for each account',async()=>{
 const identity=crypto.randomUUID(),first=await publish(identity,pack)
 const second=await publish(identity,{...pack,title:'Second episode'})
 const {latestPlayed}=await import('./storage')
 expect(await latestPlayed(identity)).toBeUndefined()
 await saveProgress(identity,first.id,{steps:[null],quizzes:[],seed:7},first)
 await saveProgress(identity,second.id,{steps:[],quizzes:[],seed:8},second)
 expect((await latestPlayed(identity))?.id).toBe(second.id)
 await saveProgress(identity,first.id,{steps:[null,null],quizzes:[],seed:7},first)
 expect((await latestPlayed(identity))?.id).toBe(first.id)
 expect((await progressForRelease(identity,first))?.steps).toEqual([null,null])
 expect(await latestPlayed('other-'+identity)).toBeUndefined()
})

it('places imported Moonlight episodes in LMS in numeric order',async()=>{
 const release=await publish(crypto.randomUUID(),{...pack,title:'Moonlight 14 — Can You Carve Moonlight?'})
 expect(release.category).toBe('lms')
 expect(release.episode).toBe(14)
})
