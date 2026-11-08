import {useEffect,useRef,useState} from 'react'
import './audio-mode.css'

export interface EncounterOptions {enabled:boolean;chinese:boolean;english:boolean;showChinese:boolean;showPinyin:boolean;showGloss:boolean}
export interface AudioModeOptions {encounters: EncounterOptions[]; englishPause:number; automaticChoices:boolean; choiceDelay:number}

export function defaultEncounters(readThenListenDefault=false): EncounterOptions[] {
  return [
    {enabled:true,chinese:true,english:false,showChinese:true,showPinyin:true,showGloss:true},
    {enabled:readThenListenDefault,chinese:true,english:true,showChinese:false,showPinyin:false,showGloss:false},
    {enabled:false,chinese:true,english:true,showChinese:false,showPinyin:false,showGloss:false},
  ]
}

const FIELD_LABELS:Array<{key:keyof Omit<EncounterOptions,'enabled'>;label:string;group:'text'|'audio'}> = [
  {key:'showChinese',label:'Chinese',group:'text'},
  {key:'showPinyin',label:'Pinyin',group:'text'},
  {key:'showGloss',label:'English',group:'text'},
  {key:'chinese',label:'Chinese',group:'audio'},
  {key:'english',label:'English',group:'audio'},
]

export default function AudioModeDialog({open,running,options,onOptions,onClose,onStart,onStop,onPocket}:{open:boolean;running:boolean;options:AudioModeOptions;onOptions:(options:AudioModeOptions)=>void;onClose:()=>void;onStart:()=>void;onStop:()=>void;onPocket:()=>void}){
  const dialog=useRef<HTMLDialogElement>(null)
  const [selected,setSelected]=useState(0)
  useEffect(()=>{if(open)dialog.current?.showModal();else dialog.current?.close()},[open])
  const encounters=options.encounters.length===3?options.encounters:defaultEncounters()
  const current=encounters[selected]??encounters[0]
  const setEncounter=(patch:Partial<EncounterOptions>)=>onOptions({...options,encounters:encounters.map((e,i)=>i===selected?{...e,...patch}:e)})
  return <dialog ref={dialog} className="audio-mode-dialog" aria-labelledby="audio-mode-title" onCancel={onClose} onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
    <div className="audio-mode-panel">
      <h2 id="audio-mode-title">Audio Mode</h2>
      <p>Listen through the story. Preferences are saved on this device.</p>
      <h3>Encounters</h3>
      <div className="encounter-tabs" role="tablist" aria-label="Encounters">
        {encounters.map((e,i)=>(
          <button key={i} type="button" role="tab" aria-selected={selected===i} className={`encounter-tab${selected===i?' is-active':''}${e.enabled?'':' is-off'}`} onClick={()=>setSelected(i)}>
            {i+1}{e.enabled?'':' (off)'}
          </button>
        ))}
      </div>
      <fieldset><legend>Encounter {selected+1}</legend>
        <label className="encounter-enable"><input type="checkbox" checked={current.enabled} onChange={e=>setEncounter({enabled:e.target.checked})}/> Experience this encounter</label>
        <fieldset><legend>Text</legend>
          {FIELD_LABELS.filter(f=>f.group==='text').map(f=>(
            <label key={f.key}><input type="checkbox" checked={current[f.key]} onChange={e=>setEncounter({[f.key]:e.target.checked} as Partial<EncounterOptions>)}/> {f.label}</label>
          ))}
        </fieldset>
        <fieldset><legend>Audio</legend>
          {FIELD_LABELS.filter(f=>f.group==='audio').map(f=>(
            <label key={f.key}><input type="checkbox" checked={current[f.key]} onChange={e=>setEncounter({[f.key]:e.target.checked} as Partial<EncounterOptions>)}/> {f.label}</label>
          ))}
        </fieldset>
        <p className="audio-mode-note">Chinese audio uses the episode recording, or a device voice when needed. English audio uses your device’s speech voice.</p>
      </fieldset>
      <label>Pause before English<select aria-label="Pause before English" value={options.englishPause} onChange={e=>onOptions({...options,englishPause:Number(e.target.value)})}>{[0,1,2,3,5,10].map(n=><option key={n} value={n}>{n===0?'No pause':`${n} ${n===1?'second':'seconds'}`}</option>)}</select></label>
      <fieldset><legend>Story choices</legend>
        <select aria-label="Story choices" value={options.automaticChoices?'automatic':'manual'} onChange={e=>onOptions({...options,automaticChoices:e.target.value==='automatic'})}>
          <option value="manual">Manual — wait for me</option>
          <option value="automatic">Automatic — choose randomly</option>
        </select>
      </fieldset>
      {options.automaticChoices&&<label>Automatic choice delay<select aria-label="Automatic choice delay" value={options.choiceDelay} onChange={e=>onOptions({...options,choiceDelay:Number(e.target.value)})}>{[0,3,5,10].map(n=><option key={n} value={n}>{n===0?'No pause':`${n} ${n===1?'second':'seconds'}`}</option>)}</select></label>}
      <p className="audio-mode-note">Automatic mode reads the choices aloud, then picks one at random. You can choose yourself at any time. Playback stops at the end of the episode.</p>
      <fieldset><legend>Screen-off listening</legend>
        <p className="audio-mode-note">Prepare one recording, tap Play, then lock your Android phone. Automatic choices select a route in advance and read the selected responses. Manual choices stop the recording when it is time to choose. English uses recorded Kokoro speech.</p>
        <button type="button" disabled={!encounters.some(e=>e.enabled&&(e.chinese||e.english))} onClick={onPocket}>Prepare pocket listening</button>
      </fieldset>
      <div className="audio-mode-actions"><button type="button" onClick={onClose}>Close</button>{running&&<button type="button" onClick={onStop}>Stop Audio Mode</button>}<button type="button" className="episode-primary" onClick={onStart}>{running?'Resume Audio Mode':'Start Audio Mode'}</button></div>
    </div>
  </dialog>
}