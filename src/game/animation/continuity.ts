import type {StoryState} from './shared/engine/story-engine.js'
export interface ContinuityCondition {all?:string[];any?:string[];none?:string[]}
export interface ContinuityDefinition {
 sourceId:string;title:string
 fields:{id:string;label:string;sourceVariable?:string;options:{value:string;label:string;when?:ContinuityCondition}[]}[]
 states:string[][]
}
export interface ContinuitySnapshot {sourceId:string;values:string[]}
export function validateContinuity(value:unknown):string[]{
 if(value===undefined)return []
 const fail=['Invalid continuity recap definition']
 if(!value||typeof value!=='object')return fail
 const d=value as ContinuityDefinition
 if(typeof d.sourceId!=='string'||!/^[a-z0-9-]+$/.test(d.sourceId)||typeof d.title!=='string'||!d.title.trim()||!Array.isArray(d.fields)||!d.fields.length||d.fields.length>12||!Array.isArray(d.states)||!d.states.length||d.states.length>4096)return fail
 const ids=new Set<string>()
 for(const f of d.fields){
  if(!f||typeof f.id!=='string'||ids.has(f.id)||typeof f.label!=='string'||!Array.isArray(f.options)||!f.options.length||f.options.length>32||f.sourceVariable!==undefined&&typeof f.sourceVariable!=='string')return fail
  ids.add(f.id);const options=new Set<string>()
  for(const o of f.options){if(!o||typeof o.value!=='string'||typeof o.label!=='string'||!o.label.trim()||options.has(o.value))return fail;options.add(o.value)
   if(o.when!==undefined){if(!o.when||typeof o.when!=='object'||!Object.keys(o.when).length||Object.entries(o.when).some(([k,v])=>!['all','any','none'].includes(k)||!Array.isArray(v)||!v.length||v.some(x=>typeof x!=='string')))return fail}
  }
 }
 if(d.states.some(row=>!Array.isArray(row)||row.length!==d.fields.length||row.some((v,i)=>!d.fields[i].options.some(o=>o.value===v))))return fail
 return []
}
export function validSnapshot(d:ContinuityDefinition,s:ContinuitySnapshot|undefined):s is ContinuitySnapshot {
 return Boolean(s&&s.sourceId===d.sourceId&&Array.isArray(s.values)&&d.states.some(row=>JSON.stringify(row)===JSON.stringify(s.values)))
}
export function snapshotFromState(d:ContinuityDefinition,state:StoryState):ContinuitySnapshot|undefined {
 if(!state.ended)return
 const choices=new Set(state.history.flatMap(h=>h.choice?[h.choice.selected]:[]))
 const values=d.fields.map(f=>{
  if(f.sourceVariable)return String(state.variables[f.sourceVariable])
  const matches=f.options.filter(o=>o.when&&(o.when.all?.every(x=>choices.has(x))??true)&&(o.when.any?.some(x=>choices.has(x))??true)&&(o.when.none?.every(x=>!choices.has(x))??true))
  return matches.length===1?matches[0].value:''
 })
 const snapshot={sourceId:d.sourceId,values};return validSnapshot(d,snapshot)?snapshot:undefined
}
