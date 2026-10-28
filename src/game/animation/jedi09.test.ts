import {it,expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {compileStory,replayStory,advanceStory,type StoryState} from './shared/engine/story-engine.js'
import {continuityScript,snapshotFromState,validSnapshot,validateContinuity} from './continuity'
import type {ChinesePackage} from './package'
const prior=JSON.parse(readFileSync('stories/animated/jedi-08.json','utf8')) as ChinesePackage
const pack=JSON.parse(readFileSync('stories/animated/jedi-09.json','utf8')) as ChinesePackage
function walk(story:ReturnType<typeof compileStory>['story'],done:(s:StoryState,steps:(string|null)[])=>void){
 function visit(s:StoryState,steps:(string|null)[]){if(s.ended){expect(replayStory(story,steps,1)).toEqual(s);done(s,steps);return}const n=story.nodes[s.cursor];for(const c of n.type==='choice'?n.options.map((o:{id:string})=>o.id):[null])visit(advanceStory(story,s,c),[...steps,c])}
 visit(replayStory(story,[],1),[])
}
it('carries all 54,432 memories exactly without expanding the continuity table',()=>{
 const d=pack.continuity!,endings=new Map<string,StoryState>();expect(validateContinuity(d)).toEqual([]);expect(d.states).toEqual([])
 walk(compileStory(prior.script,prior.assets).story,s=>{const choices=s.history.flatMap(h=>h.choice?[h.choice.selected]:[]);endings.set([choices.find(c=>['take','trust','shared'].includes(c)),choices.at(-1)].join('/'),s)})
 expect(endings.size).toBe(6);let count=0
 for(const values of prior.continuity!.states)for(const [key,state]of endings){const snapshot=snapshotFromState(d,state,{sourceId:prior.continuity!.sourceId,values});if(!snapshot||snapshot.values.slice(0,10).join('/')!==values.join('/')||snapshot.values.slice(10).join('/')!==key)throw Error('Lost or altered memory');count++}
 const graph=d.stateGraph!,counts=new Map<number,number>();function paths(id:number):number{if(id===-1)return 1;if(counts.has(id))return counts.get(id)!;const n=Object.values(graph.nodes[id].edges).reduce((a,next)=>a+paths(next),0);counts.set(id,n);return n}
 expect(count).toBe(54432);expect(paths(graph.root)).toBe(count);expect(graph.nodes.length).toBeLessThan(100)
 const bad=[...prior.continuity!.states[0],'take','own'];bad[7]='drain';bad[9]='isolate';expect(validSnapshot(d,{sourceId:d.sourceId,values:bad})).toBe(false)
})
it('all 192 routes keep inherited memories but finish the same story with no new outcome branches',()=>{
 const d=pack.continuity!;let count=0;const endings=new Set<string>()
 for(const east of ['take','trust','shared'])for(const mei of ['alive','dead']){
 const values=[...prior.continuity!.states.find(x=>x[4]===mei)!,east,'record'],snapshot={sourceId:d.sourceId,values}
 const story=compileStory(continuityScript(pack.script,d,snapshot),pack.assets).story
 expect(Object.keys(story.variables).sort()).toEqual(['eastern','mei'])
 walk(story,s=>{count++;const choices=s.history.flatMap(h=>h.choice?[h.choice.selected]:[]),text=s.history.map(h=>h.text).join('\n');expect(choices).toHaveLength(5)
 expect(s.variables.eastern).toBe(['take','trust','shared'].indexOf(east));expect(s.variables.mei).toBe(mei==='alive')
 expect(text.includes('Mei还活着')).toBe(mei==='alive');expect(text.includes('Mei去世了')).toBe(mei==='dead')
 expect(text.includes('机器接不到新的要求了')).toBe(east==='take');expect(text.includes('钥匙还在Ren那里')).toBe(east==='trust');expect(text.includes('只帮今天')).toBe(east==='shared')
 expect(text).toContain('我愿意听。不表示我原谅你了。');expect(text).toContain('那里没有水，都是干石头。');expect(text).toContain('能喝的水没有变多');expect(text).toContain('不表示可以重新分水')
 expect(text.includes('水停下来')||text.includes('水停了')).toBe(true);expect(s.history.some(h=>['Tao','Q','Mei'].includes(h.actor??''))).toBe(false)
 endings.add(s.history.at(-1)!.text!)
 })}
 expect(count).toBe(192);expect([...endings]).toEqual(['明天，我们一起回来修管子。'])
})
