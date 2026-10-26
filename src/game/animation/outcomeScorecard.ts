import type {StoryState} from './shared/engine/story-engine.js'

export interface OutcomeCondition {all?:string[];any?:string[];none?:string[]}
export interface OutcomeRule {when:OutcomeCondition;points:Record<string,number>;reason:string}
export interface OutcomeScorecard {
 title:string;note:string
 categories:{id:string;label:string;base:number;description:string}[]
 rules:OutcomeRule[]
 facts:{when:OutcomeCondition;text:string}[]
 resources:{variable:string;label:string;unit:string}[]
}
const record=(v:unknown):v is Record<string,unknown>=>Boolean(v)&&typeof v==='object'&&!Array.isArray(v)
/** Validate imported metadata before it can affect the completion view. */
export function validateOutcomeScorecard(value:unknown,story:{nodes:{type:string;options?:{id:string}[]}[];variables:Record<string,{initial:unknown}>}):string[]{
 if(value===undefined)return []
 const errors:string[]=[];const fail=(s:string)=>errors.push('Outcome scorecard: '+s)
 if(!record(value)){fail('expected an object');return errors}
 const str=(v:unknown)=>typeof v==='string'&&v.trim().length>0
 if(!str(value.title)||!str(value.note))fail('title and scoring note are required')
 if(!Array.isArray(value.categories)||value.categories.length!==3){fail('exactly three categories are required');return errors}
 const ids=new Set<string>()
 for(const c of value.categories){if(!record(c)||!str(c.id)||!str(c.label)||!str(c.description)||!Number.isFinite(c.base)||Number(c.base)<0||Number(c.base)>100){fail('invalid category');continue}if(ids.has(String(c.id)))fail('duplicate category');ids.add(String(c.id))}
 const options=new Set(story.nodes.flatMap(n=>n.options?.map(o=>o.id)??[]))
 const condition=(v:unknown)=>{if(!record(v)){fail('invalid condition');return}if(Object.keys(v).some(k=>!['all','any','none'].includes(k)))fail('unknown condition field');for(const k of ['all','any','none'])if(v[k]!==undefined&&(!Array.isArray(v[k])||!(v[k] as unknown[]).length||(v[k] as unknown[]).some(o=>typeof o!=='string'||!options.has(o))))fail('unknown or empty option condition')}
 if(!Array.isArray(value.rules))fail('rules are required');else for(const r of value.rules){if(!record(r)){fail('invalid rule');continue}condition(r.when);if(!str(r.reason)||!record(r.points)||Object.entries(r.points).some(([k,v])=>!ids.has(k)||typeof v!=='number'||!Number.isFinite(v)||Math.abs(v)>100))fail('invalid points or explanation')}
 if(!Array.isArray(value.facts))fail('facts are required');else for(const f of value.facts){if(!record(f)){fail('invalid fact');continue}condition(f.when);if(!str(f.text))fail('fact text required')}
 if(!Array.isArray(value.resources))fail('resources are required');else for(const r of value.resources)if(!record(r)||!str(r.label)||!str(r.unit)||typeof r.variable!=='string'||typeof story.variables[r.variable]?.initial!=='number')fail('invalid resource')
 return errors
}
export function evaluateOutcomeScorecard(def:OutcomeScorecard,state:StoryState){
 const choices=new Set(state.history.flatMap(h=>h.choice?[h.choice.selected]:[]))
 const matches=(c:OutcomeCondition)=>(c.all?.every(x=>choices.has(x))??true)&&(c.any?.some(x=>choices.has(x))??true)&&(c.none?.every(x=>!choices.has(x))??true)
 const applied=def.rules.filter(r=>matches(r.when))
 const categories=def.categories.map(c=>({...c,score:Math.max(0,Math.min(100,c.base+applied.reduce((sum,r)=>sum+(Object.hasOwn(r.points,c.id)?r.points[c.id]:0),0))),reasons:applied.filter(r=>Object.hasOwn(r.points,c.id)).map(r=>r.reason)}))
 return {categories,balance:Math.round(Math.cbrt(categories.reduce((product,c)=>product*c.score,1))),facts:def.facts.filter(f=>matches(f.when)).map(f=>f.text),resources:def.resources.map(r=>({...r,value:state.variables[r.variable]}))}
}
