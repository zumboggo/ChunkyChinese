import {compileStory,type StoryState} from './shared/engine/story-engine.js'
export interface ContinuityCondition {all?:string[];any?:string[];none?:string[]}
export interface ContinuityDefinition {
 sourceId:string;title:string
 fields:{id:string;label:string;sourceVariable?:string;sourceField?:{sourceId:string;index:number};options:{value:string;label:string;when?:ContinuityCondition;initialVariables?:Record<string,number|boolean>}[]}[]
 states:string[][]
 stateGraph?:{root:number;nodes:{field:number;edges:Record<string,number>}[]}
}
export interface ContinuitySnapshot {sourceId:string;values:string[]}
export function validateContinuity(value:unknown):string[]{
 if(value===undefined)return []
 const fail=['Invalid continuity recap definition']
 if(!value||typeof value!=='object')return fail
 const d=value as ContinuityDefinition
 if(typeof d.sourceId!=='string'||!/^[a-z0-9-]+$/.test(d.sourceId)||typeof d.title!=='string'||!d.title.trim()||!Array.isArray(d.fields)||!d.fields.length||d.fields.length>12||!Array.isArray(d.states)||(!d.states.length&&!d.stateGraph)||d.states.length>16384)return fail
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
 if(d.stateGraph!==undefined){
  const g=d.stateGraph
  if(!g||typeof g!=='object')return fail
  if(d.states.length||!Array.isArray(g.nodes)||!g.nodes.length||g.nodes.length>16384||!Number.isInteger(g.root)||g.root<0||g.root>=g.nodes.length)return fail
  const reached=new Set<number>()
  function visit(id:number,field:number):boolean {
   if(id===-1)return field===d.fields.length
   const n=g.nodes[id]
   if(!n||n.field!==field||!n.edges||typeof n.edges!=='object'||Array.isArray(n.edges)||!Object.keys(n.edges).length)return false
   if(reached.has(id))return true
   reached.add(id)
   return Object.entries(n.edges).every(([value,next])=>d.fields[field]?.options.some(o=>o.value===value)&&Number.isInteger(next)&&next>=-1&&next<id&&visit(next,field+1))
  }
  if(!visit(g.root,0)||reached.size!==g.nodes.length)return fail
 }
 return []
}
/** Exact suffix sharing; no invalid combinations are introduced. Legacy rows stay supported. */
export function compactContinuity(d:ContinuityDefinition):ContinuityDefinition {
 const errors=validateContinuity(d);if(errors.length)throw Error(errors[0])
 if(d.stateGraph)return structuredClone(d)
 const nodes:NonNullable<ContinuityDefinition['stateGraph']>['nodes']=[],intern=new Map<string,number>()
 function build(rows:string[][],field:number):number {
  if(field===d.fields.length)return -1
  const groups=new Map<string,string[][]>()
  for(const row of rows){const group=groups.get(row[field])??[];group.push(row);groups.set(row[field],group)}
  const edges=Object.fromEntries([...groups].sort(([a],[b])=>a.localeCompare(b)).map(([value,group])=>[value,build(group,field+1)]))
  const key=JSON.stringify([field,edges]),found=intern.get(key);if(found!==undefined)return found
  const id=nodes.length;nodes.push({field,edges});intern.set(key,id);return id
 }
 const root=build(d.states,0)
 return {...structuredClone(d),states:[],stateGraph:{root,nodes}}
}
export function continuityOptions(d:ContinuityDefinition,prefix:string[]):string[]{
 if(prefix.length>=d.fields.length)return []
 if(!d.stateGraph)return [...new Set(d.states.filter(row=>prefix.every((v,i)=>v===row[i])).map(row=>row[prefix.length]))]
 let id=d.stateGraph.root
 for(const value of prefix){const edges=d.stateGraph.nodes[id]?.edges;if(!edges||!Object.hasOwn(edges,value))return [];id=edges[value]}
 return Object.keys(d.stateGraph.nodes[id]?.edges??{})
}
export function validSnapshot(d:ContinuityDefinition,s:ContinuitySnapshot|undefined):s is ContinuitySnapshot {
 if(!s||s.sourceId!==d.sourceId||!Array.isArray(s.values)||s.values.length!==d.fields.length)return false
 if(!d.stateGraph)return d.states.some(row=>row.every((v,i)=>v===s.values[i]))
 let id=d.stateGraph.root
 for(const value of s.values){const edges=d.stateGraph.nodes[id]?.edges;if(!edges||!Object.hasOwn(edges,value))return false;id=edges[value]}
 return id===-1
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

/** Extend a compact definition without expanding every historical combination.
 * Requirements map new option values to allowed values of named prior fields.
 * Callers still set sourceField mappings for their new source episode explicitly.
 */
export function extendContinuity(d:ContinuityDefinition,field:ContinuityDefinition['fields'][number],requirements:Record<string,Record<string,string[]>>={}):ContinuityDefinition {
 const base=compactContinuity(d),g=base.stateGraph!,dependencies=new Set<number>()
 for(const [value,rules] of Object.entries(requirements)){
  if(!field.options.some(o=>o.value===value))throw Error('Unknown extension option')
  for(const [id,values] of Object.entries(rules)){
   const index=d.fields.findIndex(f=>f.id===id)
   if(index<0||!Array.isArray(values)||!values.length||values.some(v=>!d.fields[index].options.some(o=>o.value===v)))throw Error('Unknown requirement field or value')
   dependencies.add(index)
  }
 }
 const nodes:typeof g.nodes=[],intern=new Map<string,number>(),memo=new Map<string,number>()
 function node(field:number,edges:Record<string,number>){const key=JSON.stringify([field,edges]),found=intern.get(key);if(found!==undefined)return found;const id=nodes.length;nodes.push({field,edges});intern.set(key,id);return id}
 function visit(id:number,values:Record<string,string>):number{
  const key=JSON.stringify([id,values]),found=memo.get(key);if(found!==undefined)return found
  let result:number
  if(id===-1){
   const options=field.options.filter(o=>Object.entries(requirements[o.value]??{}).every(([field,allowed])=>allowed.includes(values[field])))
   result=options.length?node(d.fields.length,Object.fromEntries(options.map(o=>[o.value,-1]))):-2
  }else{
   const current=g.nodes[id],edges:Record<string,number>=Object.create(null)
   for(const [value,next] of Object.entries(current.edges)){
    const child=visit(next,dependencies.has(current.field)?{...values,[d.fields[current.field].id]:value}:values)
    if(child!==-2)edges[value]=child
   }
   result=Object.keys(edges).length?node(current.field,edges):-2
  }
  memo.set(key,result);return result
 }
 const root=visit(g.root,{}),result={...base,fields:[...base.fields,structuredClone(field)],stateGraph:{root,nodes}}
 const errors=validateContinuity(result);if(errors.length)throw Error(errors[0])
 return result
}
