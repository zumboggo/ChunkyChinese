import {it,expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {compileStory,replayStory,advanceStory,type StoryState} from './shared/engine/story-engine.js'
import {continuityScript,snapshotFromState,validateContinuity} from './continuity'
import type {ChinesePackage} from './package'
const packs=[11,12,13].map(n=>JSON.parse(readFileSync(`stories/animated/jedi-${n}.json`,'utf8')) as ChinesePackage)
const memories:string[][]=[],graph=packs[0].continuity!.stateGraph!
function paths(id:number,values:string[]){if(id===-1){memories.push(values);return}const node=graph.nodes[id];for(const [v,next]of Object.entries(node.edges)){const vs=[...values];vs[node.field]=v;paths(next,vs)}}paths(graph.root,[])
function bound(p:ChinesePackage,values:string[]){return compileStory(continuityScript(p.script,p.continuity!,{sourceId:p.continuity!.sourceId,values}),p.assets).story}
function firstEnd(story:ReturnType<typeof bound>){let s=replayStory(story,[],1);while(!s.ended){const n=story.nodes[s.cursor];s=advanceStory(story,s,n.type==='choice'?n.options[0].id:null)}return s}
function walk(story:ReturnType<typeof bound>,done:(s:StoryState)=>void){function visit(s:StoryState,steps:(string|null)[]){if(s.ended){expect(replayStory(story,steps,1)).toEqual(s);done(s);return}const n=story.nodes[s.cursor];for(const c of n.type==='choice'?n.options.map((o:{id:string})=>o.id):[null])visit(advanceStory(story,s,c),[...steps,c])}visit(replayStory(story,[],1),[])}
it('carries 54,432 histories with the actual Episode 11 delivery and no new memory fields',()=>{
 expect(memories).toHaveLength(54432);const ends11=new Map<number,StoryState>(),ends12=new Map<number,StoryState>()
 for(const p of packs.slice(1)){expect(validateContinuity(p.continuity!)).toEqual([]);expect(p.continuity!.fields).toHaveLength(12);expect(p.continuity!.stateGraph!.nodes).toHaveLength(graph.nodes.length)}
 for(const values of memories){const water=Number(values[5]),expected=[...values];expected[5]=String(water+2)
 if(!ends11.has(water))ends11.set(water,firstEnd(bound(packs[0],values)))
 const s12=snapshotFromState(packs[1].continuity!,ends11.get(water)!,{sourceId:packs[0].continuity!.sourceId,values})
 if(JSON.stringify(s12?.values)!==JSON.stringify(expected))throw Error('Episode 12 lost memory or delivery')
 if(!ends12.has(water))ends12.set(water,firstEnd(bound(packs[1],expected)))
 const s13=snapshotFromState(packs[2].continuity!,ends12.get(water)!,s12)
 if(JSON.stringify(s13?.values)!==JSON.stringify(expected))throw Error('Episode 13 lost memory or delivery')
 }
})
for(const [index,episode,delta,ending]of [[1,12,0,'我们关好管子，保留记录。检查合格了，答应过的事还没有结束。'],[2,13,4,'我们准备出发。水多了4桶。我们还要对答应过的话负责。']] as const)it(`Episode ${episode}: all 160 routes preserve water accounting and converge`,()=>{
 const p=packs[index],ends=new Set<string>();let count=0
 for(let old=0;old<=18;old+=2){const values=[...memories.find(v=>v[5]===String(old))!];values[5]=String(old+2)
 walk(bound(p,values),s=>{count++;expect(s.variables.water).toBe(old+2+delta);expect(s.history.filter(h=>h.choice)).toHaveLength(4);expect(s.history.some(h=>['Tao','Q','Mei'].includes(h.actor??''))).toBe(false);ends.add(s.history.at(-1)!.text!)})}
 expect(count).toBe(160);expect([...ends]).toEqual([ending])
})
