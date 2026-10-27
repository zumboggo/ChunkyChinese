import {useEffect,useState} from 'react'
import {validSnapshot,type ContinuityDefinition,type ContinuitySnapshot} from './continuity'
import type {HotkeySettings} from '../../types'
import './episode-continuity.css'
export function ContinuitySummary({definition,snapshot}:{definition:ContinuityDefinition;snapshot:ContinuitySnapshot}){
 return <ul>{definition.fields.map((f,i)=><li key={f.id}><strong>{f.label}: </strong>{f.options.find(o=>o.value===snapshot.values[i])?.label}</li>)}</ul>
}
export default function EpisodeContinuity({definition,initial,onDone,hotkeys}:{definition:ContinuityDefinition;initial?:ContinuitySnapshot;onDone:(s:ContinuitySnapshot)=>void;hotkeys?:HotkeySettings}){
 const [values,setValues]=useState<string[]>(()=>validSnapshot(definition,initial)?initial.values:[])
 const [field,setField]=useState(0),[page,setPage]=useState(0),[review,setReview]=useState(()=>validSnapshot(definition,initial))
 const options=definition.fields[field].options.filter(o=>definition.states.some(row=>row[field]===o.value&&values.slice(0,field).every((v,i)=>v===row[i])))
 const visible=options.slice(page*3,page*3+3),snapshot={sourceId:definition.sourceId,values}
 function choose(value:string){const next=[...values.slice(0,field),value];setValues(next);setPage(0);if(field===definition.fields.length-1)setReview(true);else setField(field+1)}
 useEffect(()=>{
  const handler=(e:KeyboardEvent)=>{
   if(e.defaultPrevented||e.repeat||e.ctrlKey||e.metaKey||e.altKey||(e.target as HTMLElement)?.closest('input,select,textarea,[contenteditable="true"]'))return
   const keys=['1','2','3','4'],custom=[hotkeys?.choiceA,hotkeys?.choiceB,hotkeys?.choiceC,hotkeys?.choiceD]
   let i=keys.indexOf(e.key.toLowerCase());if(i<0)i=custom.findIndex(k=>k?.toLowerCase()===e.key.toLowerCase());if(i<0)return
   e.preventDefault()
   if(review){if(i===0&&validSnapshot(definition,snapshot))onDone(snapshot);else if(i===1){setReview(false);setValues([]);setField(0);setPage(0)}}
   else if(i<visible.length)choose(visible[i].value);else if(i===3&&options.length>3)setPage((page+1)%Math.ceil(options.length/3))
  }
  window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler)
 })
 return <section className="episode-continuity" aria-label="Previous episode outcome"><h2>{definition.title}</h2>
 <p>{initial?'Your completed save is available. Confirm it or choose another outcome.':'No completed save was found here. Select the outcome you reached; later options show only possible combinations.'}</p>
 {review?<><ContinuitySummary definition={definition} snapshot={snapshot}/><button onClick={()=>onDone(snapshot)} disabled={!validSnapshot(definition,snapshot)}>1 · Confirm outcome</button><button onClick={()=>{setReview(false);setValues([]);setField(0);setPage(0)}}>2 · Choose another outcome</button></>:<><p>Recap {field+1} of {definition.fields.length}</p><h3>{definition.fields[field].label}</h3>{visible.map((o,i)=><button key={o.value} onClick={()=>choose(o.value)}>{i+1} · {o.label}</button>)}{options.length>3&&<button onClick={()=>setPage((page+1)%Math.ceil(options.length/3))}>4 · More options</button>}{field>0&&<button onClick={()=>{setField(field-1);setPage(0)}}>Back</button>}</>}
 <p>Your earlier losses and water remain unchanged during this expedition. Reading has no time limit.</p></section>
}
