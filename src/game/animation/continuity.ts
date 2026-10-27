import {compileStory,type StoryState} from './shared/engine/story-engine.js'
export interface ContinuityCondition {all?:string[];any?:string[];none?:string[]}
export interface ContinuityDefinition {
 sourceId:string;title:string
 fields:{id:string;label:string;sourceVariable?:string;sourceField?:{sourceId:string;index:number};options:{value:string;label:string;when?:ContinuityCondition;initialVariables?:Record<string,number|boolean>}[]}[]
 states:string[][]
}
export interface ContinuitySnapshot {sourceId:string;values:string[]}
export function validateContinuity(value:unknown):string[]{
 if(value===undefined)return []
 const fail=['Invalid continuity recap definition']
 if(!value||typeof value!=='object')return fail
 const d=value as ContinuityDefinition
 if(typeof d.sourceId!=='string'||!/^[a-z0-9-]+$/.test(d.sourceId)||typeof d.title!=='string'||!d.title.trim()||!Array.isArray(d.fields)||!d.fields.length||d.fields.length>12||!Array.isArray(d.states)||!d.states.length||d.states.length>16384)return fail
 const ids=new Set<string>()
 for(const f of d.fields){
  if(!f||typeof f.id!=='string'||ids.has(f.id)||typeof f.label!=='string'||!Array.isArray(f.options)||!f.options.length||f.options.length>32||f.sourceVariable!==undefined&&typeof f.sourceVariable!=='string')return fail
  if(f.sourceField!==undefined&&(!f.sourceField||typeof f.sourceField!=='object'||!/^[a-z0-9-]+$/.test(f.sourceField.sourceId)||!Number.isInteger(f.sourceField.index)||f.sourceField.index<0||f.sourceField.index>11||f.sourceVariable))return fail
  ids.add(f.id);const options=new Set<string>()
  for(const o of f.options){if(!o||typeof o.value!=='string'||typeof o.label!=='string'||!o.label.trim()||options.has(o.value))return fail;options.add(o.value)
   if(o.initialVariables!==undefined&&(!o.initialVariables||typeof o.initialVariables!=='object'||Array.isArray(o.initialVariables)||Object.entries(o.initialVariables).some(([k,v])=>! /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(k)||!(typeof v==='boolean'||Number.isInteger(v)))))return fail
   if(o.when!==undefined){if(!o.when||typeof o.when!=='object'||!Object.keys(o.when).length||Object.entries(o.when).some(([k,v])=>!['all','any','none'].includes(k)||!Array.isArray(v)||!v.length||v.some(x=>typeof x!=='string')))return fail}
  }
 }
 if(d.states.some(row=>!Array.isArray(row)||row.length!==d.fields.length||row.some((v,i)=>!d.fields[i].options.some(o=>o.value===v))))return fail
 return []
}
export function validSnapshot(d:ContinuityDefinition,s:ContinuitySnapshot|undefined):s is ContinuitySnapshot {
 return Boolean(s&&s.sourceId===d.sourceId&&Array.isArray(s.values)&&d.states.some(row=>JSON.stringify(row)===JSON.stringify(s.values)))
}
export function snapshotFromState(d:ContinuityDefinition,state:StoryState,prior?:ContinuitySnapshot):ContinuitySnapshot|undefined {
 if(!state.ended)return
 const choices=new Set(state.history.flatMap(h=>h.choice?[h.choice.selected]:[]))
 const values=d.fields.map(f=>{
  if(f.sourceField)return prior?.sourceId===f.sourceField.sourceId?prior.values[f.sourceField.index]:''
  if(f.sourceVariable)return String(state.variables[f.sourceVariable])
  const matches=f.options.filter(o=>o.when&&(o.when.all?.every(x=>choices.has(x))??true)&&(o.when.any?.some(x=>choices.has(x))??true)&&(o.when.none?.every(x=>!choices.has(x))??true))
  return matches.length===1?matches[0].value:''
 })
 const snapshot={sourceId:d.sourceId,values};return validSnapshot(d,snapshot)?snapshot:undefined
}

/** Bind only declared, bounded initial values; packages and saved choice histories stay immutable. */
export function continuityScript(script:string,d:ContinuityDefinition|undefined,s:ContinuitySnapshot|undefined):string {
 if(!d||!validSnapshot(d,s))return script
 const values:Record<string,number|boolean>=Object.create(null)
 d.fields.forEach((f,i)=>Object.assign(values,f.options.find(o=>o.value===s.values[i])?.initialVariables))
 return script.replace(/^(\s*variable ([a-zA-Z][a-zA-Z0-9_-]*) = )(true|false|-?\d+)(.*)$/gm,(line,start,id,_value,end)=>Object.hasOwn(values,id)?start+String(values[id])+end:line)
}
export function validateContinuityBindings(script:string,d:ContinuityDefinition|undefined,assets:Parameters<typeof compileStory>[1]):string[]{
 if(!d||validateContinuity(d).length)return []
 const variables=compileStory(script,assets).story?.variables
 if(!variables)return ['Cannot validate continuity variable bindings']
 const bound=new Set<string>()
 for(const field of d.fields){
  const names=new Set(field.options.flatMap(o=>Object.keys(o.initialVariables??{})))
  for(const name of names){if(bound.has(name))return ['Continuity variable is bound by multiple fields'];bound.add(name)}
  for(const option of field.options)for(const [name,value]of Object.entries(option.initialVariables??{})){
   const v=variables[name]
   if(!v||typeof value!==typeof v.initial||typeof value==='number'&&(value<v.min||value>v.max))return ['Continuity initial value must match a declared bounded variable']
  }
 }
 return []
}
