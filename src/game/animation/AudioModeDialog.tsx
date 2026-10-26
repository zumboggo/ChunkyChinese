import {useEffect,useRef} from 'react'
import './audio-mode.css'

export interface AudioModeOptions {english:boolean;englishPause:number;automaticChoices:boolean;choiceDelay:number}
export default function AudioModeDialog({open,running,options,onOptions,showChinese,showPinyin,showGloss,onChinese,onPinyin,onGloss,onClose,onStart,onStop}:{open:boolean;running:boolean;options:AudioModeOptions;onOptions:(options:AudioModeOptions)=>void;showChinese:boolean;showPinyin:boolean;showGloss:boolean;onChinese:(v:boolean)=>void;onPinyin:(v:boolean)=>void;onGloss:(v:boolean)=>void;onClose:()=>void;onStart:()=>void;onStop:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null)
 useEffect(()=>{if(open)dialog.current?.showModal();else dialog.current?.close()},[open])
 return <dialog ref={dialog} className="audio-mode-dialog" aria-labelledby="audio-mode-title" onCancel={onClose} onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
  <div className="audio-mode-panel">
   <h2 id="audio-mode-title">Audio Mode</h2>
   <p>Listen through the story. Your preferences apply to every episode on this device.</p>
   <label>Spoken language<select aria-label="Spoken language" value={options.english?'bilingual':'chinese'} onChange={e=>onOptions({...options,english:e.target.value==='bilingual'})}><option value="chinese">Chinese</option><option value="bilingual">Chinese followed by English</option></select></label>
   <p className="audio-mode-note">English uses your device’s speech voice. Chinese uses the episode recording, or a device voice when needed.</p>
   <label>Pause before English<select aria-label="Pause before English" disabled={!options.english} value={options.englishPause} onChange={e=>onOptions({...options,englishPause:Number(e.target.value)})}>{[0,1,2,3,5,10].map(n=><option key={n} value={n}>{n===0?'No pause':`${n} ${n===1?'second':'seconds'}`}</option>)}</select></label>
   <fieldset><legend>Visible text</legend>
    <label><input type="checkbox" checked={showChinese} onChange={e=>onChinese(e.target.checked)}/> Characters</label>
    <label><input type="checkbox" checked={showPinyin} onChange={e=>onPinyin(e.target.checked)}/> Pinyin</label>
    <label><input type="checkbox" checked={showGloss} onChange={e=>onGloss(e.target.checked)}/> English</label>
    <button type="button" onClick={()=>{onChinese(false);onPinyin(false);onGloss(false)}}>Hide all text</button>
   </fieldset>
   <label>Story choices<select aria-label="Story choices" value={options.automaticChoices?'automatic':'manual'} onChange={e=>onOptions({...options,automaticChoices:e.target.value==='automatic'})}><option value="manual">Manual — wait for me</option><option value="automatic">Automatic — choose randomly</option></select></label>
   {options.automaticChoices&&<label>Automatic choice delay<select aria-label="Automatic choice delay" value={options.choiceDelay} onChange={e=>onOptions({...options,choiceDelay:Number(e.target.value)})}>{[0,3,5,10].map(n=><option key={n} value={n}>{n===0?'No pause':`${n} ${n===1?'second':'seconds'}`}</option>)}</select></label>}
   <p className="audio-mode-note">Automatic mode reads the choices aloud, then picks one at random. You can choose yourself at any time. Playback stops at the end of the episode.</p>
   <div className="audio-mode-actions"><button type="button" onClick={onClose}>Close</button>{running&&<button type="button" onClick={onStop}>Stop Audio Mode</button>}<button type="button" className="episode-primary" onClick={onStart}>{running?'Resume Audio Mode':'Start Audio Mode'}</button></div>
  </div>
 </dialog>
}
