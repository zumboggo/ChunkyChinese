import {useEffect,useRef} from 'react'
import './audio-mode.css'

export interface EncounterOptions {chinese:boolean;english:boolean;showChinese:boolean;showPinyin:boolean;showGloss:boolean}
export interface AudioModeOptions {secondEnabled?:boolean;second?:EncounterOptions;chinese?:boolean;english:boolean;englishPause:number;automaticChoices:boolean;choiceDelay:number}
export default function AudioModeDialog({open,running,options,onOptions,showChinese,showPinyin,showGloss,onChinese,onPinyin,onGloss,onClose,onStart,onStop,onPocket}:{open:boolean;running:boolean;options:AudioModeOptions;onOptions:(options:AudioModeOptions)=>void;showChinese:boolean;showPinyin:boolean;showGloss:boolean;onChinese:(v:boolean)=>void;onPinyin:(v:boolean)=>void;onGloss:(v:boolean)=>void;onClose:()=>void;onStart:()=>void;onStop:()=>void;onPocket:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null)
 useEffect(()=>{if(open)dialog.current?.showModal();else dialog.current?.close()},[open])
 return <dialog ref={dialog} className="audio-mode-dialog" aria-labelledby="audio-mode-title" onCancel={onClose} onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
  <div className="audio-mode-panel">
   <h2 id="audio-mode-title">Audio Mode</h2>
   <p>Listen through the story. Your preferences apply to every episode on this device.</p>
   <h3>First encounter</h3>
   <fieldset><legend>Audio</legend>
    <label><input type="checkbox" checked={options.chinese!==false} onChange={e=>onOptions({...options,chinese:e.target.checked})}/> Chinese audio</label>
    <label><input type="checkbox" checked={options.english} onChange={e=>onOptions({...options,english:e.target.checked})}/> English audio</label>
   </fieldset>
   <p className="audio-mode-note">English uses your device’s speech voice. Chinese uses the episode recording, or a device voice when needed.</p>
   <label>Pause before English<select aria-label="Pause before English" disabled={!(options.english&&options.chinese!==false)&&!(options.secondEnabled&&options.second?.english&&options.second.chinese)} value={options.englishPause} onChange={e=>onOptions({...options,englishPause:Number(e.target.value)})}>{[0,1,2,3,5,10].map(n=><option key={n} value={n}>{n===0?'No pause':`${n} ${n===1?'second':'seconds'}`}</option>)}</select></label>
   <fieldset><legend>Visible text</legend>
    <label><input type="checkbox" checked={showChinese} onChange={e=>onChinese(e.target.checked)}/> Characters</label>
    <label><input type="checkbox" checked={showPinyin} onChange={e=>onPinyin(e.target.checked)}/> Pinyin</label>
    <label><input type="checkbox" checked={showGloss} onChange={e=>onGloss(e.target.checked)}/> English</label>
    <button type="button" onClick={()=>{onChinese(false);onPinyin(false);onGloss(false)}}>Hide all text</button>
   </fieldset>
   <h3>Second encounter</h3>
   <label><input type="checkbox" checked={options.secondEnabled===true} onChange={e=>onOptions({...options,secondEnabled:e.target.checked})}/> Enable second encounter</label>
   <p className="audio-mode-note">Continue repeats the same slide with these settings, then advances. Automatic playback follows both encounters. Turn this off to use only the first encounter.</p>
   {options.secondEnabled&&options.second&&<fieldset><legend>Second encounter options</legend>{([
    ['chinese','Chinese audio'],['english','English audio'],['showChinese','Characters'],['showPinyin','Pinyin'],['showGloss','English'],
   ] as const).map(([key,label])=><label key={key}><input type="checkbox" checked={options.second![key]} onChange={e=>onOptions({...options,second:{...options.second!,[key]:e.target.checked}})}/>{label}</label>)}</fieldset>}
   <label>Story choices<select aria-label="Story choices" value={options.automaticChoices?'automatic':'manual'} onChange={e=>onOptions({...options,automaticChoices:e.target.value==='automatic'})}><option value="manual">Manual — wait for me</option><option value="automatic">Automatic — choose randomly</option></select></label>
   {options.automaticChoices&&<label>Automatic choice delay<select aria-label="Automatic choice delay" value={options.choiceDelay} onChange={e=>onOptions({...options,choiceDelay:Number(e.target.value)})}>{[0,3,5,10].map(n=><option key={n} value={n}>{n===0?'No pause':`${n} ${n===1?'second':'seconds'}`}</option>)}</select></label>}
   <p className="audio-mode-note">Automatic mode reads the choices aloud, then picks one at random. You can choose yourself at any time. Playback stops at the end of the episode.</p>
   <fieldset><legend>Screen-off listening</legend><p className="audio-mode-note">Prepare one recording, tap Play, then lock your Android phone. Automatic choices select a route in advance and read the selected responses. Manual choices stop the recording when it is time to choose. English uses recorded Kokoro speech.</p><button type="button" disabled={options.chinese===false&&!options.english&&!(options.secondEnabled&&(options.second?.chinese||options.second?.english))} onClick={onPocket}>Prepare pocket listening</button></fieldset>
   <div className="audio-mode-actions"><button type="button" onClick={onClose}>Close</button>{running&&<button type="button" onClick={onStop}>Stop Audio Mode</button>}<button type="button" className="episode-primary" onClick={onStart}>{running?'Resume Audio Mode':'Start Audio Mode'}</button></div>
  </div>
 </dialog>
}
