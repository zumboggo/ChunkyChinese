import {createPortal} from 'react-dom';
import {useEffect,useRef,useState,type RefObject} from 'react';
import {SceneSound,SOUND_LABELS,type SoundSettings} from './shared/components/scene-sound';
/** Episode-specific settings; the shared animation engine remains reusable. */
export default function EpisodeAtmosphere({root,preset='none',ducked=false,voiceVolume,onVoiceVolume,preferencesKey}:{root:RefObject<HTMLElement|null>;preset?:string;ducked?:boolean;voiceVolume?:number;onVoiceVolume?:(value:number)=>void;preferencesKey:string}){
 const engine=useRef<SceneSound|null>(null),captionTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
 const saved=()=>{try{return JSON.parse(localStorage.getItem(preferencesKey)??'{}')}catch{return {}}};
 const [settings,setSettings]=useState<SoundSettings>(()=>{const s=saved();return {ambience:s.ambience===true,effects:s.effects===true,ambienceVolume:typeof s.ambienceVolume==='number'?Math.max(0,Math.min(1,s.ambienceVolume)):.3,effectsVolume:typeof s.effectsVolume==='number'?Math.max(0,Math.min(1,s.effectsVolume)):.45}});
 const [captions,setCaptions]=useState(()=>saved().captions===true),[caption,setCaption]=useState(''),[hidden,setHidden]=useState(()=>document.hidden),[error,setError]=useState('');
 useEffect(()=>{try{localStorage.setItem(preferencesKey,JSON.stringify({...settings,captions}))}catch{/* Optional device preferences. */}},[preferencesKey,settings,captions]);
 const current=useRef({settings,captions,preset,ducked,hidden});current.current={settings,captions,preset,ducked,hidden};
 useEffect(()=>{
  const audio=new SceneSound();engine.current=audio;const el=root.current;
  const stop=()=>{audio.stopEffects();clearTimeout(captionTimer.current);setCaption('');};
  const sound=(event:Event)=>{const cue=(event as CustomEvent<string>).detail;if(!SOUND_LABELS[cue]||current.current.hidden)return;audio.play(cue);if(current.current.captions){clearTimeout(captionTimer.current);setCaption(SOUND_LABELS[cue]);captionTimer.current=setTimeout(()=>setCaption(''),1400);}};
  const activate=()=>{if(current.current.settings.ambience||current.current.settings.effects)void audio.activate().catch(()=>setError('Tap a sound setting to enable audio.'));};
  el?.addEventListener('pointerdown',activate);el?.addEventListener('keydown',activate);
  const visibility=()=>{setHidden(document.hidden);if(document.hidden)stop();};
  el?.addEventListener('story-sound',sound);el?.addEventListener('story-sound-stop',stop);document.addEventListener('visibilitychange',visibility);
  return()=>{el?.removeEventListener('pointerdown',activate);el?.removeEventListener('keydown',activate);clearTimeout(captionTimer.current);el?.removeEventListener('story-sound',sound);el?.removeEventListener('story-sound-stop',stop);document.removeEventListener('visibilitychange',visibility);audio.dispose();engine.current=null;};
 },[root]);
 useEffect(()=>{engine.current?.configure(settings,preset,ducked,hidden);},[settings,preset,ducked,hidden]);
 const change=(next:SoundSettings)=>{setSettings(next);engine.current?.configure(next,preset,ducked,hidden);if(next.ambience||next.effects)void engine.current?.activate().then(()=>setError('')).catch(()=>{setSettings(s=>({...s,ambience:false,effects:false}));setError('Sound unavailable. The story still works without it.');});};
 return <div className="story-atmosphere" data-sound-ducked={ducked}>
  <div className="story-sound-settings">
   {onVoiceVolume&&<label>Voice volume<input aria-label="Voice volume" type="range" min="0" max="1" step=".05" value={voiceVolume} onChange={e=>onVoiceVolume(Number(e.target.value))}/></label>}
   <label><input type="checkbox" checked={settings.ambience} onChange={e=>change({...settings,ambience:e.target.checked})}/>Ambience</label>
   <label>Ambience volume<input aria-label="Ambience volume" type="range" min="0" max="1" step=".05" value={settings.ambienceVolume} onChange={e=>change({...settings,ambienceVolume:Number(e.target.value)})}/></label>
   <label><input type="checkbox" checked={settings.effects} onChange={e=>change({...settings,effects:e.target.checked})}/>Sound effects</label>
   <label>Effects volume<input aria-label="Effects volume" type="range" min="0" max="1" step=".05" value={settings.effectsVolume} onChange={e=>change({...settings,effectsVolume:Number(e.target.value)})}/></label>
   <label><input type="checkbox" checked={captions} onChange={e=>{setCaptions(e.target.checked);setCaption('');}}/>Sound captions</label>
   {error&&<p role="status">{error}</p>}
  </div>
  {captions&&root.current&&createPortal(<p className="story-sound-caption" role="status">{caption?`[${caption}]`:'\u00a0'}</p>,root.current)}
 </div>;
}
