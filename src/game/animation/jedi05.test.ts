import {it,expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {compileStory,replayStory,advanceStory,type StoryState} from './shared/engine/story-engine.js'
import {continuityScript,snapshotFromState,validateContinuity,validSnapshot} from './continuity'
import {validateChinese,exportPackage,importPackage,type ChinesePackage} from './package'
const pack=JSON.parse(readFileSync('stories/animated/jedi-05.json','utf8')) as ChinesePackage
const prior=JSON.parse(readFileSync('stories/animated/jedi-04.json','utf8')) as ChinesePackage
const d=pack.continuity!
function walk(story:ReturnType<typeof compileStory>['story'],onEnd:(s:StoryState,steps:(string|null)[])=>void){
 function visit(s:StoryState,steps:(string|null)[]){if(s.ended){onEnd(s,steps);return}const n=story.nodes[s.cursor];for(const choice of n.type==='choice'?n.options.map(o=>o.id):[null])visit(advanceStory(story,s,choice),[...steps,choice])}
 visit(replayStory(story,[],1),[])
}
it('carries all prior continuity and equipment outcomes without resurrecting losses',()=>{
 const story=compileStory(prior.script,prior.assets).story;const seen=new Set<string>();let routes=0
 walk(story,(s)=>{for(const values of prior.continuity!.states){const snapshot=snapshotFromState(d,s,{sourceId:prior.continuity!.sourceId,values})!;expect(validSnapshot(d,snapshot)).toBe(true);expect(snapshot.values.slice(0,6)).toEqual(values);seen.add(snapshot.values.join('/'));routes++}})
 expect(routes).toBe(7560);expect(seen.size).toBe(378);expect(new Set(d.states.map(x=>x.join('/')))).toEqual(seen)
 walk(story,s=>expect(snapshotFromState(d,s)).toBeUndefined())
})
it('earns alternatives, keeps permanent sacrifices and replays all sixty routes',()=>{
 let routes=0
 for(const evidence of ['bottle','diagram','both']){
  const snapshot={sourceId:d.sourceId,values:d.states.find(x=>x.at(-1)===evidence)!};const script=continuityScript(pack.script,d,snapshot),story=compileStory(script,pack.assets).story
  expect(Object.keys(story.variables)).toHaveLength(4)
  walk(story,(s,steps)=>{routes++;const choices=s.history.flatMap(h=>h.choice?[h.choice.selected]:[]);const text=s.history.map(h=>h.text).join('\n');expect(choices).toHaveLength(4)
   const braced=choices.includes('brace-rope')||choices.includes('brace-saber');expect(s.variables.held).toBe(braced);expect(s.variables.part).toBe(!choices.includes('leave'))
   if(braced){expect(choices).toContain('inspect');expect(choices).toContain(evidence==='both'?'brace-saber':'brace-rope');expect(text).toContain('门挡不住风暴');expect(text).toContain('我们答应回来修')}
   if(choices.includes('drain'))expect(text).toContain('门坏了，从前的记录没了')
   if(choices.includes('leave'))expect(text).toContain('管子还坏着')
   if(evidence==='diagram'){expect(text).toContain('没有水可以检查');expect(text).not.toContain('水不干净，不能喝')}
   else expect(text).toContain('水不干净，不能喝')
   expect(text).toContain(evidence==='bottle'?'我们看着管子慢慢找路':'我们不用再找路')
   expect(text).toContain('屋子的水没有变多，没有变少');expect(s.history.some(h=>['Tao','Q','Min','Mei'].includes(h.actor??''))).toBe(false)
   for(let i=0;i<=steps.length;i++){const resumed=replayStory(story,steps.slice(0,i),1);if(i===steps.length)expect(resumed).toEqual(s)}
  })
 }
 expect(routes).toBe(60)
})
it('round trips bindings and rejects malformed or unbounded initialization',async()=>{
 expect(validateChinese(pack).errors).toEqual([])
 expect((await importPackage(new File([await exportPackage(pack)],'episode.zip'))).continuity).toEqual(d)
 for(const binding of [null,[],5,{evidence:3},{evidence:true},{invented:1}]){
  const copy=structuredClone(pack);copy.continuity!.fields[6].options[0].initialVariables=binding as never;expect(validateChinese(copy).errors.length).toBeGreaterThan(0)
 }
 for(const sourceField of [null,{sourceId:'jedi-03-v1',index:-1},{sourceId:'jedi-03-v1',index:99}]){const bad=structuredClone(d);bad.fields[0].sourceField=sourceField as never;expect(validateContinuity(bad).length).toBeGreaterThan(0)}
 expect(continuityScript(prior.script,prior.continuity,{sourceId:prior.continuity!.sourceId,values:prior.continuity!.states[0]})).toBe(prior.script)
 expect(continuityScript(pack.script,d,{sourceId:'wrong',values:d.states[0]})).toBe(pack.script)
})
