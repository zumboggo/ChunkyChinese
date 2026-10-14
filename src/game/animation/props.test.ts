import {expect,it} from 'vitest'
import {readFileSync} from 'node:fs'
import {chineseTexts,validateChinese} from './package'
const load=(name:string)=>JSON.parse(readFileSync('stories/animated/'+name+'.json','utf8'))
it('updates only episode 2 staging while retaining every reviewed line and audio clip',()=>{
 const old=load('moonlight-02'),next=load('moonlight-02-v2')
 expect(validateChinese(next).errors).toEqual([])
 expect(chineseTexts(next)).toEqual(chineseTexts(old));expect(next.chinese).toEqual(old.chinese)
 expect(next.script).toContain('prop Hyun phone');expect(next.script).toContain('prop Hyun none')
 expect(next.script).toBe(readFileSync('stories/animated/source/moonlight-02-v2.story','utf8'))
})
it('ships a valid rehearsal for every new fantasy action without adding a quiz',()=>{
 const pack=load('prop-rehearsal');expect(validateChinese(pack).errors).toEqual([]);expect(pack.quiz).toEqual([])
 for(const cue of ['phone-shout','sword-strike','sword-blocked','sword-dodged','shoot-arrow','magic-beam'])expect(pack.script).toContain(cue)
})
