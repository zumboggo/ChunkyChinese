import {it,expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {compileStory,settleStory,initialStoryState,advanceStory,replayStory,type StoryState} from './shared/engine/story-engine.js'
import {validateContinuity,validSnapshot,snapshotFromState} from './continuity'
import {validateChinese,exportPackage,importPackage,type ChinesePackage} from './package'
const prior=JSON.parse(readFileSync('stories/animated/jedi-03.json','utf8')) as ChinesePackage
const next=JSON.parse(readFileSync('stories/animated/jedi-04.json','utf8')) as ChinesePackage
const definition=next.continuity!
it('restores every reachable prior ending, including exact water and permanent losses',()=>{
 expect(validateContinuity(definition)).toEqual([])
 const story=compileStory(prior.script,prior.assets).story;const seen=new Set<string>();let routes=0
 function visit(s:StoryState){if(s.ended){routes++;const result=snapshotFromState(definition,s)!;expect(validSnapshot(definition,result)).toBe(true);const choices=new Set(s.history.flatMap(h=>h.choice?[h.choice.selected]:[]));expect(result.values[0]).toBe([...choices].find(x=>['tao-lost','half','empty','q-lost'].includes(x)));expect(result.values[4]).toBe(choices.has('treat')||choices.has('prep-evacuate')?'alive':'dead');expect(result.values[5]).toBe(String(s.variables.water));seen.add(result.values.join('/'));return}const n=story.nodes[s.cursor];if(n.type==='choice')for(const o of n.options)visit(advanceStory(story,s,o.id));else visit(advanceStory(story,s,null))}
 visit(settleStory(story,initialStoryState(story)));expect(routes).toBe(1224);expect(seen.size).toBe(126);expect(new Set(definition.states.map(s=>s.join('/')))).toEqual(seen)
 expect(snapshotFromState(definition,initialStoryState(story))).toBeUndefined()
})
it('rejects malformed or impossible snapshots and preserves recap in ZIP packages',async()=>{
 expect(validateContinuity(undefined)).toEqual([])
 for(const bad of [null,{}, {...definition,fields:[null]}, {...definition,states:[['invented']]}, {...definition,fields:[{...definition.fields[0],options:[{value:'x',label:'x',when:{any:null}}]}]}])expect(validateContinuity(bad).length).toBeGreaterThan(0)
 expect(validSnapshot(definition,{sourceId:'other',values:definition.states[0]})).toBe(false)
 expect(validSnapshot(definition,{sourceId:definition.sourceId,values:['q-lost','honest','shared','pledge','alive','99']})).toBe(false)
 const zip=await exportPackage(next);expect((await importPackage(new File([zip],'episode.zip'))).continuity).toEqual(definition)
 expect(validateChinese(prior).errors).toEqual([])
})
it('earns both evidence items through preparation and preserves every complete route on replay',()=>{
 const story=compileStory(next.script,next.assets).story;expect(Object.keys(story.variables).length).toBeLessThanOrEqual(4);expect(next.outcomeScorecard).toBeUndefined();expect(validateChinese(next).errors).toEqual([])
 let count=0
 function visit(s:StoryState,steps:(string|null)[],choices:string[]){if(s.ended){count++;expect(choices).toHaveLength(5);expect(s.variables.sample).toBe(choices.includes('bottle')||choices.includes('both'));expect(s.variables.map).toBe(choices.includes('diagram')||choices.includes('both'));if(choices.includes('both'))expect(choices).toContain('anchor');expect(s.history.filter(h=>['Tao','Q','Min','Mei'].includes(h.actor??''))).toEqual([]);expect(replayStory(story,steps,1)).toEqual(s);return}const n=story.nodes[s.cursor];if(n.type==='choice')for(const o of n.options){if(o.id==='both')expect(s.variables.secured).toBe(true);visit(advanceStory(story,s,o.id),[...steps,o.id],[...choices,o.id])}else visit(advanceStory(story,s,null),[...steps,null],choices)}
 visit(settleStory(story,initialStoryState(story)),[],[]);expect(count).toBe(60)
})
