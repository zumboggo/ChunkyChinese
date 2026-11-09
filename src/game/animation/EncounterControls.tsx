import {useState} from 'react'
import {defaultEncounters,encounterFields,type EncounterSettings} from './encounters'
import './audio-mode.css'
export default function EncounterControls({options,onChange,supportive,running,onRunning,onPocket}:{options:EncounterSettings;onChange:(v:EncounterSettings)=>void;supportive:boolean;running:boolean;onRunning:(v:boolean)=>void;onPocket:()=>void}) {
 const [selected,setSelected]=useState(0)
 const index=Math.min(selected,options.count-1),encounter=options.encounters[index]
 return <div className="encounter-controls">
  <div role="group" aria-label="Number of encounters"><span>Encounters:</span>{[1,2,3].map(count=><button type="button" key={count} aria-pressed={options.count===count} onClick={()=>onChange({...options,count})}>{count}</button>)}</div>
  <div role="tablist" aria-label="Edit encounter">{Array.from({length:options.count},(_,i)=><button type="button" role="tab" id={`encounter-tab-${i}`} aria-controls="encounter-panel" aria-selected={index===i} key={i} onClick={()=>setSelected(i)}>Encounter {i+1}</button>)}</div>
  <div role="tabpanel" id="encounter-panel" aria-labelledby={`encounter-tab-${index}`}>
   {encounterFields.map(([key,label])=><label key={key}><input type="checkbox" checked={encounter[key]} disabled={encounter[key]&&encounterFields.filter(([field])=>encounter[field]).length===1} onChange={e=>onChange({...options,encounters:options.encounters.map((v,i)=>i===index?{...v,[key]:e.target.checked}:v)})}/>{label}</label>)}
  </div>
  <button type="button" onClick={()=>{onChange(defaultEncounters(supportive));setSelected(0)}}>Reset encounters</button>
  <label><input type="checkbox" checked={running} onChange={e=>onRunning(e.target.checked)}/>Automatic playback</label>
  <details className="cinema-preferences"><summary>Playback options</summary>
   <label>Reading time<select aria-label="Reading time" value={options.readingSeconds} onChange={e=>onChange({...options,readingSeconds:Number(e.target.value)})}>{[3,5,10,15,20,30].map(n=><option key={n} value={n}>{n} seconds</option>)}</select></label>
   <label>Pause before English<select aria-label="Pause before English" value={options.englishPause} onChange={e=>onChange({...options,englishPause:Number(e.target.value)})}>{[0,1,2,3,5,10].map(n=><option key={n} value={n}>{n} seconds</option>)}</select></label>
   <label>Story choices<select aria-label="Story choices" value={options.automaticChoices?'automatic':'manual'} onChange={e=>onChange({...options,automaticChoices:e.target.value==='automatic'})}><option value="manual">Manual — wait for me</option><option value="automatic">Automatic — choose randomly</option></select></label>
   {options.automaticChoices&&<label>Automatic choice delay<select aria-label="Automatic choice delay" value={options.choiceDelay} onChange={e=>onChange({...options,choiceDelay:Number(e.target.value)})}>{[0,3,5,10].map(n=><option key={n} value={n}>{n} seconds</option>)}</select></label>}
   <p>Silent encounters use the reading timer. Speech plays Chinese before English. Close Controls to resume playback.</p>
   <button type="button" onClick={onPocket}>Prepare pocket listening</button>
   <p>Pocket listening prepares a recording for screen-off playback. Manual choices stop the recording; automatic choices select a route in advance.</p>
  </details>
 </div>
}
