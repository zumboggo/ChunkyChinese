import {it,expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {compactContinuity,extendContinuity,continuityOptions,validSnapshot,validateContinuity,continuityScript,type ContinuityDefinition} from './continuity'
import {exportPackage,importPackage,validateChinese} from './package'
const pack=JSON.parse(readFileSync('stories/animated/jedi-08.json','utf8'))
const original=pack.continuity as ContinuityDefinition,compact=compactContinuity(original)
it('preserves all 9072 outcomes and every partial recap option with much smaller data',()=>{
 expect(validateContinuity(compact)).toEqual([])
 expect(JSON.stringify(compact).length).toBeLessThan(JSON.stringify(original).length/10)
 const prefixes=new Map<string,Set<string>>()
 for(const row of original.states){
  expect(validSnapshot(compact,{sourceId:original.sourceId,values:row})).toBe(true)
  for(let i=0;i<row.length;i++){const key=JSON.stringify(row.slice(0,i)),set=prefixes.get(key)??new Set();set.add(row[i]);prefixes.set(key,set)}
 }
 for(const [prefix,values] of prefixes)expect(new Set(continuityOptions(compact,JSON.parse(prefix)))).toEqual(values)
 expect(original.states).toHaveLength(9072)
 const impossible=[...original.states.find(r=>r[7]==='drain')!];impossible[9]='isolate'
 expect(validSnapshot(compact,{sourceId:original.sourceId,values:impossible})).toBe(false)
 expect(validSnapshot(compact,{sourceId:'wrong',values:original.states[0]})).toBe(false)
 expect(validSnapshot(compact,{sourceId:original.sourceId,values:original.states[0].slice(1)})).toBe(false)
 expect(continuityOptions(compact,['not-an-option'])).toEqual([])
})
it('extends prior facts without multiplying stored rows or permitting impossible isolation',()=>{
 const prior=JSON.parse(readFileSync('stories/animated/jedi-07.json','utf8')).continuity as ContinuityDefinition
 const extended=extendContinuity(prior,original.fields[9],{isolate:{station:['leave','brace']}})
 expect(extended.states).toEqual([])
 expect(extended.stateGraph!.nodes.length).toBeLessThan(100)
 for(const row of prior.states)for(const value of ['destroy','preserve','isolate'])expect(validSnapshot(extended,{sourceId:extended.sourceId,values:[...row,value]})).toBe(value!=='isolate'||row[7]!=='drain')
 expect(()=>extendContinuity(prior,original.fields[9],{isolate:{invented:['yes']}})).toThrow()
})
it('rejects malformed graphs, cycles, wrong depth, dangling references and ambiguous dual formats',()=>{
 const alter=(fn:(d:ContinuityDefinition)=>void)=>{const d=structuredClone(compact);fn(d);expect(validateContinuity(d).length).toBeGreaterThan(0)}
 alter(d=>{d.states=original.states})
 alter(d=>{d.stateGraph!.root=-1})
 alter(d=>{d.stateGraph!.nodes[d.stateGraph!.root].field=2})
 alter(d=>{d.stateGraph!.nodes[d.stateGraph!.root].edges={bad:0}})
 alter(d=>{const n=d.stateGraph!.nodes[d.stateGraph!.root];n.edges[Object.keys(n.edges)[0]]=d.stateGraph!.root})
 alter(d=>{d.stateGraph!.nodes.push({field:0,edges:{}})})
})
it('retains saved bindings and graph data through package validation and ZIP import',async()=>{
 const p={...pack,continuity:compact};expect(validateChinese(p).errors).toEqual([])
 const snapshot={sourceId:original.sourceId,values:original.states.find(r=>r[8]==='signal'&&r[9]==='isolate')!}
 expect(continuityScript(pack.script,compact,snapshot)).toBe(continuityScript(pack.script,original,snapshot))
 expect(await importPackage(new File([await exportPackage(p)],'compact.zip'))).toEqual(p)
})
