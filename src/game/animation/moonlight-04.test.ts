import {it,expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {compileStory,initialStoryState,settleStory,advanceStory,replayStory,type StoryState} from './shared/engine/story-engine.js'
import {validateChinese,chineseTexts,size,type ChinesePackage} from './package'
import {bundledCatalog} from '../bundledLibrary'
const pack=JSON.parse(readFileSync('stories/animated/moonlight-04.json','utf8')) as ChinesePackage
const {story}=compileStory(pack.script,pack.assets)
it('episode 4 has complete interlinear speech, approved cast and ordered catalog',()=>{
 expect(validateChinese(pack).errors).toEqual([]);expect(size(pack)).toBeLessThan(5_000_000)
 expect(pack.script).toBe(readFileSync('stories/animated/source/moonlight-04.story','utf8'))
 const previous=JSON.parse(readFileSync('stories/animated/moonlight-02-v3.json','utf8'))
 expect(pack.assets.characters.Hyun).toEqual(previous.assets.characters.Hyun)
 expect(bundledCatalog.filter(e=>e.category==='lms').map(e=>e.episode)).toEqual([1,2,3,4,5])
 expect(chineseTexts(pack)).toHaveLength(38)
 for(const text of chineseTexts(pack)){const l=pack.chinese!.lines[text];expect(l.interlinear?.map(c=>c.chinese).join('')).toBe(text);expect(l.interlinear?.every(c=>c.gloss&&c.pinyin)).toBe(true);expect(l.audio).toMatch(/^data:audio\/mp4;base64,/);expect(l.english).toBeTruthy()}
})
it('all four routes preserve the budget, remembered choices and resumable states',()=>{
 const routes:{choices:string[];texts:string[]}[]=[]
 function visit(state:StoryState,steps:(string|null)[],choices:string[],texts:string[]){
  expect(steps.length).toBeLessThan(50);expect(replayStory(story!,steps,1)).toEqual(state)
  if(state.ended){routes.push({choices,texts});return}
  const node=story!.nodes[state.cursor]
  if(node.type==='choice')for(const o of node.options)visit(advanceStory(story!,state,o.id),[...steps,o.id],[...choices,o.id],texts)
  else visit(advanceStory(story!,state,null),[...steps,null],choices,[...texts,node.text])
 }
 visit(settleStory(story!,initialStoryState(story!,1)),[],[],[]);expect(routes).toHaveLength(4)
 for(const r of routes){
  expect(r.texts).toContain('40,000,000韩元。这就是现在可以用的钱。')
  expect(r.texts).toContain(r.choices[0]==='family'?'我想让她们过好日子。现在，就从这里开始。':'你们拿走了钱，又没有让我变成一个笨蛋。')
  expect(r.texts).toContain(r.choices[1]==='keep'?'房子的钱不动。能用的钱，要用在有用的地方。':'违约金？不给。准备的钱？这个，可以想一想。')
  expect(r.texts.at(-1)).toBe('钱没有回来。可我终于不再坐着，什么都不做了。')
 }
})
