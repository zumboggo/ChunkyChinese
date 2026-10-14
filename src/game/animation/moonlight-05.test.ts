import {it,expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {compileStory,initialStoryState,settleStory,advanceStory,replayStory,type StoryState} from './shared/engine/story-engine.js'
import {validateChinese,chineseTexts,size,type ChinesePackage} from './package'
const pack=JSON.parse(readFileSync('stories/animated/moonlight-05.json','utf8')) as ChinesePackage
const {story,errors}=compileStory(pack.script,pack.assets)
it('episode 5 preserves source script and provides complete phrase-level audio metadata',()=>{
 expect(errors).toEqual([]);expect(validateChinese(pack).errors).toEqual([]);expect(size(pack)).toBeLessThan(5_000_000)
 expect(pack.script).toBe(readFileSync('stories/animated/source/moonlight-05.story','utf8'))
 const previous=JSON.parse(readFileSync('stories/animated/moonlight-04-v2.json','utf8'))
 expect(pack.assets).toEqual(previous.assets)
 for(const text of chineseTexts(pack)){const l=pack.chinese!.lines[text];expect(l.interlinear?.map(c=>c.chinese).join('')).toBe(text);expect(l.interlinear?.every(c=>c.gloss&&c.pinyin)).toBe(true);expect(l.audio).toMatch(/^data:audio\/mp4;base64,/)}
})
it('all four routes retain the year, market facts, two callbacks and replay state',()=>{
 const routes:{choices:string[];texts:string[]}[]=[]
 function visit(state:StoryState,steps:(string|null)[],choices:string[],texts:string[]){
  expect(steps.length).toBeLessThan(65);expect(replayStory(story!,steps,1)).toEqual(state)
  if(state.ended){routes.push({choices,texts});return}
  const node=story!.nodes[state.cursor]
  if(node.type==='choice')for(const o of node.options)visit(advanceStory(story!,state,o.id),[...steps,o.id],[...choices,o.id],texts)
  else visit(advanceStory(story!,state,null),[...steps,null],choices,[...texts,node.text])
 }
 visit(settleStory(story!,initialStoryState(story!,1)),[],[],[]);expect(routes).toHaveLength(4)
 for(const r of routes){
  expect(r.texts).toContain('就这样，我一边学用身体，一边学习怎么玩游戏，过了一整年。')
  expect(r.texts).toContain('Royal Road now holds over 75% of the world’s game market.')
  expect(r.texts).toContain('More than 90% of Korean gamers play it.')
  expect(r.texts).toContain(r.choices[0]==='stronger'?'我想比现在更强一点。现在，我知道怎么做了。':'想过好日子，就得先把眼前的事做好。')
  expect(r.texts).toContain(r.choices[1]==='players'?'我要找人多的地方。现在，大家都到这里来了。':'这一年写下来的东西，都有用了。我知道自己要去哪里了。')
  expect(r.texts.at(-1)).toBe('我还没有开始玩这个游戏。但这一年，已经不是空等了。')
 }
})
