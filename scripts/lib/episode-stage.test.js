import {it,expect} from 'vitest'
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {stageEpisodeRelease} from './episode-stage.mjs'
it('stages a new episode once, strips audio from authoring metadata, and protects released content',()=>{
 const root=mkdtempSync(join(tmpdir(),'episode-stage-'))
 try{
  mkdirSync(join(root,'public/stories/animated'),{recursive:true})
  writeFileSync(join(root,'public/stories/animated/catalog.json'),'[]')
  writeFileSync(join(root,'public/service-worker.js'),"const CACHE_VERSION = 'old'\n")
  const pack={script:'story 2\nI: 我。\nend\n',chinese:{lines:{'我。':{pinyin:'wǒ',audio:'private clip',interlinear:[]}}}},plan={pinyinReviewed:true,catalog:{id:'new-v1',category:'lms',episode:1}}
  expect(()=>stageEpisodeRelease({id:'new',plan:{...plan,pinyinReviewed:false},pack,root})).toThrow('Review')
  expect(existsSync(join(root,'stories/animated/new.json'))).toBe(false)
  stageEpisodeRelease({id:'new',plan,pack,root})
  expect(readFileSync(join(root,'stories/animated/source/new.lines.json'),'utf8')).not.toContain('private clip')
  const before=readFileSync(join(root,'stories/animated/new.json'),'utf8')
  expect(()=>stageEpisodeRelease({id:'new',plan,pack:{...pack,script:'changed'},root})).toThrow('already exists')
  expect(readFileSync(join(root,'stories/animated/new.json'),'utf8')).toBe(before)
  expect(()=>stageEpisodeRelease({id:'other',plan:{...plan,catalog:{...plan.catalog,id:'other-v1'}},pack,root})).toThrow('already exists')
 }finally{rmSync(root,{recursive:true,force:true})}
})
