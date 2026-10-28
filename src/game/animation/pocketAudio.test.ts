import {describe,it,expect} from 'vitest'
import fs from 'node:fs'
import {planPocketAudio,pocketPosition,wavHeader} from './pocketAudio'
import {compileStory,replayStory} from './shared/engine/story-engine.js'
import type {ChinesePackage} from './package'
const catalog=JSON.parse(fs.readFileSync('public/stories/animated/catalog.json','utf8')) as {path:string}[]
const start={steps:[],quizzes:[],seed:123}
const options={english:true,englishPause:3,automaticChoices:true,choiceDelay:0}
describe('pocket audio routes',()=>{
 for(const entry of catalog)it(`plans and resumes ${entry.path}`,()=>{
  const pack=JSON.parse(fs.readFileSync('public/stories/animated/'+entry.path,'utf8')) as ChinesePackage
  const story=compileStory(pack.script,pack.assets).story!
  for(const random of [()=>0,()=>0.999]){
   const plan=planPocketAudio(pack,start,options,random)
   expect(plan.ended).toBe(true)
   expect(replayStory(story,plan.end.steps,start.seed).ended).toBe(true)
   for(const beat of plan.beats){expect(()=>replayStory(story,beat.steps,start.seed)).not.toThrow();if(beat.audio)expect(beat.english).toBeTruthy()}
  }
  const manual=planPocketAudio(pack,start,{...options,automaticChoices:false})
  const state=replayStory(story,manual.end.steps,start.seed)
  expect(state.ended||story.nodes[state.cursor].type==='choice').toBe(true)
 })
 it('repeats slides with independent audio settings without advancing twice',()=>{
  const pack=JSON.parse(fs.readFileSync('public/stories/animated/'+catalog[0].path,'utf8')) as ChinesePackage
  const single=planPocketAudio(pack,start,{...options,english:false,automaticChoices:false})
  const repeated=planPocketAudio(pack,start,{...options,english:false,automaticChoices:false,secondEnabled:true,second:{chinese:false,english:true,showChinese:false,showPinyin:false,showGloss:false}})
  expect(repeated.end).toEqual(single.end)
  expect(repeated.beats).toHaveLength(single.beats.length*2)
  for(let i=0;i<single.beats.length;i++){
   const first=repeated.beats[i*2],second=repeated.beats[i*2+1]
   expect(first.english).toBeUndefined()
   expect(second.audio).toBeUndefined()
   expect(second.text).toBe(first.text)
   expect(second.steps).toEqual(first.steps)
   expect(second.encounter).toBe(2)
  }
 })
 it('maps seeks to the correct scene and completion',()=>{
  const track={markers:[{at:0,steps:[],text:'one'},{at:5,steps:[null],text:'two'}],duration:10,end:{...start,steps:[null,null]}}
  expect(pocketPosition(track,4).text).toBe('one')
  expect(pocketPosition(track,5).text).toBe('two')
  expect(pocketPosition(track,10).steps).toEqual([null,null])
 })
 it('writes a valid mono 16-bit 16kHz WAV header',()=>{
  const h=wavHeader(32000),v=new DataView(h.buffer)
  expect(new TextDecoder().decode(h.slice(0,4))).toBe('RIFF')
  expect(v.getUint32(24,true)).toBe(16000)
  expect(v.getUint32(40,true)).toBe(64000)
  expect(v.getUint32(4,true)).toBe(64036)
 })
})
