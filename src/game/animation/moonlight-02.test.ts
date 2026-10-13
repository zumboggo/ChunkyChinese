import {describe,it,expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {compileStory,initialStoryState,settleStory,advanceStory,replayStory,type StoryState} from './shared/engine/story-engine.js'
import {validateChinese,chineseTexts,exportPackage,importPackage,size,type ChinesePackage} from './package'
const pack=JSON.parse(readFileSync('stories/animated/moonlight-02.json','utf8')) as ChinesePackage
const {story}=compileStory(pack.script,pack.assets)
describe('Moonlight Sculptor episode 2',()=>{
 it('has complete language support and a portable package below 5 MB',async()=>{
  expect(validateChinese(pack).errors).toEqual([])
  expect(pack.script).toBe(readFileSync('stories/animated/source/moonlight-02.story','utf8'))
  expect(size(pack)).toBeLessThan(5_000_000)
  expect(chineseTexts(pack)).toHaveLength(57)
  for(const text of chineseTexts(pack)){
   const line=pack.chinese!.lines[text]
   expect(line.interlinear?.map(c=>c.chinese).join('')).toBe(text)
   expect(line.interlinear?.every(c=>c.pinyin&&c.gloss)).toBe(true)
   expect(line.english).toBeTruthy();expect(line.audio).toMatch(/^data:audio\/mp4;base64,/)
  }
  const zip=await exportPackage(pack)
  const restored=await importPackage(new File([await zip.arrayBuffer()],'episode.zip'))
  expect(restored).toEqual(pack)
 })
 it('keeps all eight routes canonical, remembers reactions, and resumes every step',()=>{
  const routes:{choices:string[];texts:string[]}[]=[]
  function visit(state:StoryState,steps:(string|null)[],choices:string[],texts:string[]){
   expect(steps.length).toBeLessThan(80)
   expect(replayStory(story!,steps,1)).toEqual(state)
   // Grandmother is resting offstage; never show a standing or healed figure.
   expect(Object.keys(state.stage.actors)).toEqual(['Hyun'])
   if(state.ended){routes.push({choices,texts});return}
   const node=story!.nodes[state.cursor]
   if(node.type==='choice')for(const o of node.options)visit(advanceStory(story!,state,o.id),[...steps,o.id],[...choices,o.id],texts)
   else visit(advanceStory(story!,state,null),[...steps,null],choices,[...texts,node.text])
  }
  visit(settleStory(story!,initialStoryState(story!,1)),[],[],[])
  expect(routes).toHaveLength(8)
  for(const r of routes){
   expect(r.texts).toContain('她说：30亿9千万韩元。')
   expect(r.texts).toContain('别开玩笑了。再见。')
   expect(r.texts).toContain('第二天，我去银行看。银行里真的有那些钱。')
   expect(r.texts).toContain(r.choices[1]==='joke'?'游戏里的国王，刚才对真钱说了再见。':'她没找错人。是我错了。')
   expect(r.texts).toContain(r.choices[0]==='medicine'?'我本来只希望有钱看医生。现在，真的可以好好照顾你了。':'我本来只打算买点衣服。现在，家里每个人都能过得好一点。')
   expect(r.texts.at(-1)).toBe('是啊。一起。')
  }
 })
})
