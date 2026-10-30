import {it,expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {compileStory,replayStory,advanceStory,type StoryState} from './shared/engine/story-engine.js'
import {continuityScript,snapshotFromState,validateContinuity} from './continuity'
import type {ChinesePackage} from './package'
const packs=[23,24,25].map(n=>JSON.parse(readFileSync(`stories/animated/jedi-${n}.json`,'utf8')) as ChinesePackage)
const plan=JSON.parse(readFileSync('stories/authoring/jedi/coverage-plan-16-25.json','utf8'))
const memories:string[][]=[],graph=packs[0].continuity!.stateGraph!
function paths(id:number,values:string[]){if(id===-1){memories.push(values);return}const node=graph.nodes[id];for(const [v,next]of Object.entries(node.edges)){const vs=[...values];vs[node.field]=v;paths(next,vs)}}paths(graph.root,[])
function bound(p:ChinesePackage,values:string[]){return compileStory(continuityScript(p.script,p.continuity!,{sourceId:p.continuity!.sourceId,values}),p.assets).story}
function firstEnd(story:ReturnType<typeof bound>){let s=replayStory(story,[],1);while(!s.ended){const n=story.nodes[s.cursor];s=advanceStory(story,s,n.type==='choice'?n.options[0].id:null)}return s}
function walk(story:ReturnType<typeof bound>,done:(s:StoryState)=>void){function visit(s:StoryState,steps:(string|null)[]){if(s.ended){expect(replayStory(story,steps,1)).toEqual(s);done(s);return}const n=story.nodes[s.cursor];for(const c of n.type==='choice'?n.options.map((o:{id:string})=>o.id):[null])visit(advanceStory(story,s,c),[...steps,c])}visit(replayStory(story,[],1),[])}
it('carries all 54,432 prior histories unchanged into Episodes 24 and 25',()=>{
 expect(memories).toHaveLength(54432)
 for(const p of packs.slice(1)){expect(validateContinuity(p.continuity!)).toEqual([]);expect(p.continuity!.fields).toHaveLength(12);expect(p.continuity!.stateGraph!.nodes).toHaveLength(graph.nodes.length)}
 const ends=[new Map<number,StoryState>(),new Map<number,StoryState>()]
 for(const values of memories){let snapshot={sourceId:packs[0].continuity!.sourceId,values};const water=Number(values[5])
 for(let i=0;i<2;i++){if(!ends[i].has(water))ends[i].set(water,firstEnd(bound(packs[i],values)));const next=snapshotFromState(packs[i+1].continuity!,ends[i].get(water)!,snapshot);if(JSON.stringify(next?.values)!==JSON.stringify(values))throw Error('Historical memory or water changed');snapshot=next!}
 }
})
function targetMatch(text:string,w:string){if(w==='迷')return /音乐迷|读书迷/.test(text);if(w==='老婆')return /老婆(?!婆)/.test(text);if(w==='蜜')return /蜜(?!蜂)/.test(text);if(w==='冒')return /冒(?!险)/.test(text);if(w==='处')return /处不好|处得好/.test(text);if(w==='以来')return /风暴以来|时间以来/.test(text);return text.includes(w)}
for(const [index,episode,ending]of [[1,24,'水和从前一样。照片检查好了，屋子还要等最后的检查。'],[2,25,'水和从前一样，承诺仍然算数。门开了，我也是这里的一员。']] as const)it(`Episode ${episode}: all 160 routes converge, preserve water and deliver every target twice`,()=>{
 const p=packs[index],ends=new Set<string>();let count=0
 const allocation=plan.episodes.find((e:{episode:number})=>e.episode===episode);expect(allocation.targets).toHaveLength(episode===24?17:13)
 for(let water=2;water<=20;water+=2){const values=[...memories.find(v=>v[5]===String(water))!]
 walk(bound(p,values),s=>{count++;expect(s.variables.water).toBe(water);expect(s.history.filter(h=>h.choice)).toHaveLength(4);expect(s.history.some(h=>['Tao','Q','Mei'].includes(h.actor??''))).toBe(false);ends.add(s.history.at(-1)!.text!)
 for(const w of allocation.targets){const entries=new Set(s.history.filter(h=>h.actor&&targetMatch(h.text??'',w)).map(h=>h.text));expect(entries.size,`${w} distinct spoken entries`).toBeGreaterThanOrEqual(2)}
 for(const w of allocation.reviewTargets)expect(s.history.some(h=>h.actor&&targetMatch(h.text??'',w)),`review ${w}`).toBe(true)
 })}
 expect(count).toBe(160);expect([...ends]).toEqual([ending])
})
