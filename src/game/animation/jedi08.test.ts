import {it,expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {compileStory,replayStory,advanceStory,type StoryState} from './shared/engine/story-engine.js'
import {continuityScript,snapshotFromState,validateContinuity} from './continuity'
import {validateChinese,exportPackage,importPackage,type ChinesePackage} from './package'
const prior=JSON.parse(readFileSync('stories/animated/jedi-07.json','utf8')) as ChinesePackage
const pack=JSON.parse(readFileSync('stories/animated/jedi-08.json','utf8')) as ChinesePackage
function walk(story:ReturnType<typeof compileStory>['story'],done:(s:StoryState,steps:(string|null)[])=>void){
 function visit(s:StoryState,steps:(string|null)[]){if(s.ended){expect(replayStory(story,steps,1)).toEqual(s);done(s,steps);return}const n=story.nodes[s.cursor];for(const c of n.type==='choice'?n.options.map((o:{id:string})=>o.id):[null])visit(advanceStory(story,s,c),[...steps,c])}
 visit(replayStory(story,[],1),[])
}
it('carries all 9072 reachable inherited outcomes, preserving every prior field and excluding impossible isolation',()=>{
 const d=pack.continuity!,seen=new Set<string>(),groups=new Map<string,string[][]>()
 expect(validateContinuity(d)).toEqual([])
 for(const values of prior.continuity!.states){const script=continuityScript(prior.script,prior.continuity,{sourceId:prior.continuity!.sourceId,values});groups.set(script,[...(groups.get(script)??[]),values])}
 for(const [script,rows]of groups){const story=compileStory(script,prior.assets).story,mapped=new Set<string>();walk(story,s=>{const key=snapshotFromState(d,s,{sourceId:prior.continuity!.sourceId,values:rows[0]})!.values.at(-1)!;if(mapped.has(key))return;mapped.add(key);for(const values of rows){const snapshot=snapshotFromState(d,s,{sourceId:prior.continuity!.sourceId,values})!;expect(snapshot).toBeDefined();expect(snapshot.values.slice(0,-1)).toEqual(values);seen.add(snapshot.values.join('/'))}})}
 expect(new Set(d.states.map(x=>x.join('/')))).toEqual(seen);expect(seen.size).toBe(9072)
 expect(d.states.some(x=>x[7]==='drain'&&x[9]==='isolate')).toBe(false)
 expect(validateContinuity({...d,states:Array.from({length:16385},()=>d.states[0])})).not.toEqual([])
},60000)
it('all 180 bound routes preserve injuries, records and beacon damage, and earn limited control through testing',()=>{
 const d=pack.continuity!;let count=0
 for(const tower of ['lift','signal','relay'])for(const relay of ['destroy','preserve','isolate']){
 const values=d.states.find(x=>x[8]===tower&&x[9]===relay)!,snapshot={sourceId:d.sourceId,values},story=compileStory(continuityScript(pack.script,d,snapshot),pack.assets).story
 expect(Object.keys(story.variables)).toHaveLength(4)
 walk(story,s=>{count++;const c=s.history.flatMap(h=>h.choice?[h.choice.selected]:[]),text=s.history.map(h=>h.text).join('\n');expect(c).toHaveLength(4)
 expect(s.variables.result).toBe(c.includes('shared')?2:c.includes('trust')?1:0)
 if(c.includes('shared')){expect(c).toContain('inspect');expect(text).toContain('锁好开关');expect(text).toContain('朋友没有来')}
 if(c.includes('take'))expect(text).toContain('新的要求也接不到了')
 if(c.includes('trust'))expect(text).toContain('别人也要承担这个代价')
 expect(text.includes('我的手还没好')).toBe(tower==='signal')
 expect(text.includes('塔的电线还坏着')).toBe(tower==='relay')
 expect(text.includes('牺牲了记录')).toBe(relay==='destroy')
 expect(text.includes('我记录了她不答应的事')).toBe(relay==='preserve')
 expect(text.includes('记录还在，声音停了')).toBe(relay==='isolate')
 expect(text).toContain('屋子的水没有变多');expect(text).toContain('我不能替他们答应')
 expect(s.history.some(h=>['Tao','Q','Mei','Min','Mother','Child'].includes(h.actor??''))).toBe(false)
 })}expect(count).toBe(180)
})
it('preserves the larger recap, annotations and audio through ZIP round trip',async()=>{expect(validateChinese(pack).errors).toEqual([]);expect(await importPackage(new File([await exportPackage(pack)],'episode.zip'))).toEqual(pack)})
