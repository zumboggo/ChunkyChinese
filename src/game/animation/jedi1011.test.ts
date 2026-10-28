import {it,expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {compileStory,replayStory,advanceStory,type StoryState} from './shared/engine/story-engine.js'
import {continuityScript,snapshotFromState,validateContinuity} from './continuity'
import type {ChinesePackage} from './package'
const packs=[9,10,11].map(n=>JSON.parse(readFileSync(`stories/animated/jedi-${String(n).padStart(2,'0')}.json`,'utf8')) as ChinesePackage)
function walk(story:ReturnType<typeof compileStory>['story'],done:(s:StoryState)=>void){
 function visit(s:StoryState,steps:(string|null)[]){if(s.ended){expect(replayStory(story,steps,1)).toEqual(s);done(s);return}const n=story.nodes[s.cursor];for(const c of n.type==='choice'?n.options.map((o:{id:string})=>o.id):[null])visit(advanceStory(story,s,c),[...steps,c])}visit(replayStory(story,[],1),[])
}
const memories:string[][]=[];const graph=packs[0].continuity!.stateGraph!
function paths(id:number,values:string[]){if(id===-1){memories.push(values);return}const node=graph.nodes[id];for(const [value,next] of Object.entries(node.edges)){const v=[...values];v[node.field]=value;paths(next,v)}}paths(graph.root,[])
it('preserves all 54,432 histories through the two common-story episodes',()=>{
 expect(memories).toHaveLength(54432)
 for(let i=1;i<3;i++){const d=packs[i].continuity!;expect(validateContinuity(d)).toEqual([]);expect(d.fields).toHaveLength(12);expect(d.stateGraph).toEqual(graph)
 const priorStory=compileStory(packs[i-1].script,packs[i-1].assets).story;let s=replayStory(priorStory,[],1);while(!s.ended){const node=priorStory.nodes[s.cursor];s=advanceStory(priorStory,s,node.type==='choice'?node.options[0].id:null)}
 for(const values of memories){const next=snapshotFromState(d,s,{sourceId:packs[i-1].continuity!.sourceId,values});if(JSON.stringify(next?.values)!==JSON.stringify(values))throw Error('Memory changed')}
 }
})
it('Episode 10 has sixteen rejoining routes without new permanent outcomes',()=>{
 const p=packs[1],ends=new Set<string>();let count=0
 walk(compileStory(p.script,p.assets).story,s=>{count++;expect(s.variables).toEqual({});expect(s.history.filter(h=>h.choice)).toHaveLength(4);expect(s.history.some(h=>['Tao','Q','Mei'].includes(h.actor??''))).toBe(false);ends.add(s.history.at(-1)!.text!)})
 expect(count).toBe(16);expect([...ends]).toEqual(['没有人要求我们开水。我们一起准备试一试。'])
})
it('Episode 11 adds exactly two delivered buckets once on all 160 routes and replay',()=>{
 const p=packs[2],ends=new Set<string>();let count=0
 for(let water=0;water<=18;water+=2){const values=memories.find(v=>v[5]===String(water))!;expect(values).toBeDefined();const story=compileStory(continuityScript(p.script,p.continuity!,{sourceId:p.continuity!.sourceId,values}),p.assets).story
 walk(story,s=>{count++;expect(s.variables.water).toBe(water+2);expect(s.history.filter(h=>h.choice)).toHaveLength(4);expect(s.history.map(h=>h.text).join('\n')).toContain('2桶');ends.add(s.history.at(-1)!.text!)})}
 expect(count).toBe(160);expect([...ends]).toEqual(['我们捎着水回去。明天，一起清洗和检查管子。'])
})
