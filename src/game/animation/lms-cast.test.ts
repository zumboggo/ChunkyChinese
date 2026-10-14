import {it,expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {validateChinese} from './package'
const read=(path:string)=>JSON.parse(readFileSync(path,'utf8'))
it('cast-only presentation releases preserve every story, choice, clip and setting',()=>{
 const cast=read('public/stories/animated/cast/lms.json')
 for(const [from,to] of [['moonlight-01-v2','moonlight-01-v3'],['moonlight-02-v2','moonlight-02-v3'],['moonlight-03','moonlight-03-v2']]){
  const old=read(`stories/animated/${from}.json`),next=read(`stories/animated/${to}.json`)
  expect(next.script).toBe(old.script);expect(next.chinese).toEqual(old.chinese);expect(next.quiz).toEqual(old.quiz);expect(next.assets.backgrounds).toEqual(old.assets.backgrounds)
  for(const id of Object.keys(next.assets.characters))expect(next.assets.characters[id]).toEqual(cast[id])
  expect(validateChinese(next).errors).toEqual([])
 }
 expect(cast.Hyun.rig.appearance).toMatchObject({face:'lean',eyes:'keen',hair:'tousled'});expect(cast.Grandma.rig.appearance.age).toBe('elder')
})
