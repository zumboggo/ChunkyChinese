import {it,expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {compileStory,replayStory,advanceStory,type StoryState} from './shared/engine/story-engine.js'
import {continuityScript,snapshotFromState,validSnapshot} from './continuity'
import {validateChinese,exportPackage,importPackage,type ChinesePackage} from './package'
const packs=[5,6,7].map(n=>JSON.parse(readFileSync(`stories/animated/jedi-0${n}.json`,'utf8')) as ChinesePackage)
function walk(story:ReturnType<typeof compileStory>['story'],done:(s:StoryState,steps:(string|null)[])=>void){
 function visit(s:StoryState,steps:(string|null)[]){if(s.ended){done(s,steps);return}const n=story.nodes[s.cursor];for(const c of n.type==='choice'?n.options.map((o:{id:string})=>o.id):[null]){const next=advanceStory(story,s,c),history=[...steps,c];expect(replayStory(story,history,1)).toEqual(next);visit(next,history)}}
 visit(replayStory(story,[],1),[])
}
for(const index of [1,2])it(`Episode ${index+5} carries every valid inherited outcome without resurrecting losses`,()=>{
 const pack=packs[index],prior=packs[index-1],d=pack.continuity!,seen=new Set<string>()
 // Each distinct initial binding is evaluated once; every inherited row is then mapped.
 const groups=new Map<string,string[][]>();for(const values of prior.continuity!.states){const script=continuityScript(prior.script,prior.continuity,{sourceId:prior.continuity!.sourceId,values});groups.set(script,[...(groups.get(script)??[]),values])}
 for(const [script,rows]of groups){const story=compileStory(script,prior.assets).story,mapped=new Set<string>();walk(story,s=>{const key=snapshotFromState(d,s,{sourceId:prior.continuity!.sourceId,values:rows[0]})!.values.at(-1)!;if(mapped.has(key))return;mapped.add(key);for(const values of rows){const snapshot=snapshotFromState(d,s,{sourceId:prior.continuity!.sourceId,values})!;expect(validSnapshot(d,snapshot)).toBe(true);expect(snapshot.values.slice(0,-1)).toEqual(values);seen.add(snapshot.values.join('/'))}})}
 expect(new Set(d.states.map(x=>x.join('/')))).toEqual(seen);expect(seen.size).toBe(index===1?1134:3402)
},30000)
it('Episode 6 warns before harm, earns beacon sacrifice, repairs the door and preserves prior losses on all 180 routes',()=>{
 const p=packs[1],d=p.continuity!;let count=0
 for(const station of ['drain','leave','brace'])for(const evidence of ['bottle','diagram','both']){
 const snapshot={sourceId:d.sourceId,values:d.states.find(x=>x[7]===station&&x[6]===evidence)!};const story=compileStory(continuityScript(p.script,d,snapshot),p.assets).story;expect(Object.keys(story.variables)).toHaveLength(4)
 walk(story,s=>{count++;const c=s.history.flatMap(h=>h.choice?[h.choice.selected]:[]),text=s.history.map(h=>h.text).join('\n');expect(c).toHaveLength(4)
 const result=c.includes('relay')?2:c.includes('signal')?1:0;expect(s.variables.result).toBe(result);expect(text).toContain('不过手会受伤');expect(text).toContain('电池不够')
 if(result===2){expect(c).toContain('inspect');expect(text).toContain('灯再也不能开');expect(text).toContain('灯坏了')}
 if(result===1)expect(text).toContain('手受伤了');if(result===0)expect(text).toContain('没有通知他们')
 if(station==='drain')expect(text).toContain('牺牲的记录不能回来');if(station==='leave')expect(text).toContain('管子仍然坏着')
 if(station==='brace'){expect(text).toContain('我们答应修门');expect(text).toContain(evidence==='both'?'光剑已经坏了':'绳子已经牺牲了')}
 expect(text).toContain('屋子的水没有变多，没有变少');expect(s.history.some(h=>['Tao','Q','Mei','Min'].includes(h.actor??''))).toBe(false)
 })}expect(count).toBe(180)
})
it('Episode 7 requires both prerequisites, preserves injury and beacon losses on all 108 routes',()=>{
 const p=packs[2],d=p.continuity!;let count=0
 for(const tower of ['lift','signal','relay'])for(const archive of ['drain','leave']){
 const snapshot={sourceId:d.sourceId,values:d.states.find(x=>x[8]===tower&&x[7]===archive)!};const story=compileStory(continuityScript(p.script,d,snapshot),p.assets).story;expect(Object.keys(story.variables)).toHaveLength(4)
 walk(story,s=>{count++;const c=s.history.flatMap(h=>h.choice?[h.choice.selected]:[]),text=s.history.map(h=>h.text).join('\n');expect(c).toHaveLength(4)
 if(c.includes('isolate')){expect(c).toContain('test');expect(archive).toBe('leave');expect(text).toContain('声音停了。记录还在')}
 if(c.includes('destroy'))expect(text).toContain('这里的记录也没了');if(c.includes('preserve'))expect(text).toContain('我没有答应。记录里也要写这句')
 expect(text.includes('我的手还没好')).toBe(tower==='signal');expect(text.includes('我们得亲自捎回这些事')).toBe(tower==='relay');expect(text.includes('塔的机器帮忙通知他们')).toBe(tower!=='relay')
 expect(text).toContain('屋子的水没有变多，没有变少');expect(s.history.some(h=>['Tao','Q','Mei','Min','Child'].includes(h.actor??''))).toBe(false)
 })}expect(count).toBe(108)
})
for(const p of packs.slice(1))it(`${p.title} preserves annotations, bounded state and continuity in ZIP`,async()=>{expect(validateChinese(p).errors).toEqual([]);const imported=await importPackage(new File([await exportPackage(p)],'episode.zip'));expect(imported).toEqual(p)})
