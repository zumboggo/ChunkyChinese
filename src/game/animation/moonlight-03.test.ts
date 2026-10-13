import {describe,it,expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {compileStory,initialStoryState,settleStory,advanceStory,replayStory,type StoryState} from './shared/engine/story-engine.js'
import {validateChinese,chineseTexts,exportPackage,importPackage,size,type ChinesePackage} from './package'
const pack=JSON.parse(readFileSync('stories/animated/moonlight-03.json','utf8')) as ChinesePackage
const {story}=compileStory(pack.script,pack.assets)
describe('Moonlight episode 3',()=>{
 it('embeds complete interlinear speech and portable assets below 5 MB',async()=>{
  expect(validateChinese(pack).errors).toEqual([]);expect(size(pack)).toBeLessThan(5_000_000)
  expect(pack.script).toBe(readFileSync('stories/animated/source/moonlight-03.story','utf8'))
  expect(chineseTexts(pack)).toHaveLength(60)
  for(const text of chineseTexts(pack)){const line=pack.chinese!.lines[text];expect(line.interlinear?.map(c=>c.chinese).join('')).toBe(text);expect(line.interlinear?.every(c=>c.gloss&&c.pinyin)).toBe(true);expect(line.audio).toMatch(/^data:audio\/mp4;base64,/)}
  const zip=await exportPackage(pack);expect(await importPackage(new File([await zip.arrayBuffer()],'episode.zip'))).toEqual(pack)
 })
 it('preserves payment, nonviolent outcome, challenge and callbacks through all routes and resume',()=>{
  const routes:{choices:string[];texts:string[];handoffs:number}[]=[]
  function visit(state:StoryState,steps:(string|null)[],choices:string[],texts:string[],handoffs:number){
   expect(steps.length).toBeLessThan(90);expect(replayStory(story!,steps,1)).toEqual(state)
   expect(Object.keys(state.stage.actors)).not.toContain('Grandma')
   expect(Object.keys(state.stage.actors).length).toBeLessThanOrEqual(2)
   if(state.ended){routes.push({choices,texts,handoffs});return}
   const node=story!.nodes[state.cursor]
   if(node.type==='act'){expect(node.action).toBe('give');expect(Object.keys(state.stage.actors).sort()).toEqual(['Collector','Hyun']);handoffs++}
   if(node.type==='choice')for(const o of node.options)visit(advanceStory(story!,state,o.id),[...steps,o.id],[...choices,o.id],texts,handoffs)
   else visit(advanceStory(story!,state,null),[...steps,null],choices,[...texts,node.text],handoffs)
  }
  visit(settleStory(story!,initialStoryState(story!,1)),[],[],[],0);expect(routes).toHaveLength(8)
  for(const r of routes){
   expect(r.handoffs).toBe(1)
   expect(r.texts).toContain('他们拿出90,000,000韩元，还有父亲以前写的借条。他们早就准备好了。')
   expect(r.texts).toContain('我叫Han Jinsup。觉得不对？5年里得到3,000,000,000韩元，再来找我。')
   expect(r.texts).toContain(r.choices[1]==='sister'?'我刚才只希望妹妹不会出事。现在，我听到她在门外哭。':'我刚才让奶奶别怕。现在，她的声音听起来那么累。')
   if(r.choices[2]==='money')expect(r.texts).toContain(r.choices[0]==='count'?'我会记得你们拿了多少钱。这次，我不会再算错。':'这些钱，我不会忘记。')
   expect(r.texts.at(-1)).toContain('昨天，我们还以为终于可以好好生活了。')
  }
 })
})
