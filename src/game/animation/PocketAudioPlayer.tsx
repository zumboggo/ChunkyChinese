import {useEffect,useRef,useState} from 'react'
import type {ChinesePackage} from './package'
import type {StoryProgress} from './StoryPlayback'
import type {AudioModeOptions} from './AudioModeDialog'
import {pocketPosition,preparePocketAudio,type PocketTrack} from './pocketAudio'
import EpisodeInterlinear from './EpisodeInterlinear'

export default function PocketAudioPlayer({pack,start,options,volume,showChinese,showPinyin,showGloss,onSave,onExit}:{pack:ChinesePackage;start:StoryProgress;options:AudioModeOptions;volume:number;showChinese:boolean;showPinyin:boolean;showGloss:boolean;onSave:(p:StoryProgress)=>void;onExit:(p:StoryProgress)=>void}){
 const [encounter,setEncounter]=useState<1|2>(1)
 const display=encounter===2&&options.second?options.second:{showChinese,showPinyin,showGloss}
 const audio=useRef<HTMLAudioElement>(null),saved=useRef(start),save=useRef(onSave),trackRef=useRef<PocketTrack|null>(null)
 const [track,setTrack]=useState<PocketTrack|null>(null),[url,setUrl]=useState(''),[status,setStatus]=useState('Preparing pocket listening…'),[error,setError]=useState(''),[text,setText]=useState('')
 useEffect(()=>{save.current=onSave},[onSave])
 useEffect(()=>{
  const controller=new AbortController();let objectUrl=''
  void preparePocketAudio(pack,start,options,controller.signal,setStatus).then(prepared=>{
   if(controller.signal.aborted)return
   trackRef.current=prepared;objectUrl=URL.createObjectURL(prepared.blob);setTrack(prepared);setUrl(objectUrl);setStatus('Ready. Tap Play, then lock your phone.');setText(prepared.markers[0]?.text??'')
  }).catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:String(e))})
  return()=>{controller.abort();if(objectUrl)URL.revokeObjectURL(objectUrl)}
 },[pack,start,options])
 useEffect(()=>{
  const element=audio.current;if(!element||!url)return
  element.volume=volume
  const sync=()=>{
   const prepared=trackRef.current;if(!prepared)return
   const position=pocketPosition(prepared,element.ended?prepared.duration:element.currentTime)
   saved.current={...start,steps:position.steps};save.current(saved.current);setText(position.text);setEncounter('encounter' in position&&position.encounter===2?2:1)
   if('mediaSession' in navigator&&Number.isFinite(element.duration)&&element.duration>0)try{navigator.mediaSession.setPositionState({duration:element.duration,position:Math.min(element.currentTime,element.duration),playbackRate:element.playbackRate})}catch{/* Optional controls. */}
  }
  const play=()=>{setStatus('Pocket listening is playing. You can lock your phone.');if('mediaSession' in navigator)navigator.mediaSession.playbackState='playing'}
  const pause=()=>{sync();setStatus(element.ended?(trackRef.current?.ended?'Episode complete.':'Unlock your phone to choose what happens next.'):'Paused. Resume from here or your lock screen.');if('mediaSession' in navigator)navigator.mediaSession.playbackState='paused'}
  const seek=(seconds:number)=>{element.currentTime=Math.max(0,Math.min(element.duration||0,seconds));sync()}
  const handlers:Partial<Record<MediaSessionAction,MediaSessionActionHandler>>={play:()=>{void element.play().catch(()=>setError('Tap Play in the app to resume audio.'))},pause:()=>element.pause(),seekbackward:d=>seek(element.currentTime-(d.seekOffset??10)),seekforward:d=>seek(element.currentTime+(d.seekOffset??10)),seekto:d=>seek(d.seekTime??element.currentTime)}
  if('mediaSession' in navigator){navigator.mediaSession.metadata=new MediaMetadata({title:pack.title,artist:'Chunky Chinese',album:options.english?(options.chinese===false?'English pocket listening':'Chinese followed by English'):'Chinese pocket listening'});for(const [action,handler] of Object.entries(handlers))try{navigator.mediaSession.setActionHandler(action as MediaSessionAction,handler!)}catch{/* Unsupported action. */}}
  element.addEventListener('timeupdate',sync);element.addEventListener('seeked',sync);element.addEventListener('play',play);element.addEventListener('pause',pause);element.addEventListener('ended',pause);document.addEventListener('visibilitychange',sync)
  return()=>{sync();element.pause();element.removeEventListener('timeupdate',sync);element.removeEventListener('seeked',sync);element.removeEventListener('play',play);element.removeEventListener('pause',pause);element.removeEventListener('ended',pause);document.removeEventListener('visibilitychange',sync);if('mediaSession' in navigator){for(const action of Object.keys(handlers))try{navigator.mediaSession.setActionHandler(action as MediaSessionAction,null)}catch{/* Optional action. */}navigator.mediaSession.metadata=null;navigator.mediaSession.playbackState='none'}}
 },[url,volume,pack.title,start,options.english,options.chinese])
 return <section className="pocket-audio" aria-label="Pocket listening">
  <h2>Pocket listening</h2><p>{pack.title}</p>
  <p role="status">{error||status}</p>
  {url&&<><audio ref={audio} src={url} controls preload="auto" aria-label="Pocket audio player" onError={()=>setError('This recording could not play. Return to the story and prepare it again.')}/><p>The recording is loaded on your phone for this session. Use your lock screen or headphone controls to pause and resume.</p><a href={url} download="chunky-chinese-pocket.wav">Download this recording</a></>}
  {text&&(display.showChinese||display.showPinyin||display.showGloss)&&<div className="episode-line"><EpisodeInterlinear text={text} line={pack.chinese?.lines[text]} showChinese={display.showChinese} showPinyin={display.showPinyin} showGloss={display.showGloss}/></div>}
  {track&&!track.ended&&<p>This recording stops at the next manual story choice.</p>}
  <button type="button" onClick={()=>{audio.current?.pause();onExit(saved.current)}}>Return to story</button>
 </section>
}
