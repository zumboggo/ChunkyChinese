import {useEffect,useRef,useState} from 'react'
import type {HotkeySettings} from '../../types'
import type {EpisodeIntroMedia} from './storage'
import './episode-intro.css'

export default function EpisodeIntro({intro,onDone,hotkeys}:{intro:EpisodeIntroMedia;onDone:()=>void;hotkeys?:HotkeySettings}){
 const video=useRef<HTMLVideoElement>(null)
 const [needsPlay,setNeedsPlay]=useState(true)
 const [failed,setFailed]=useState(false)

 function play(){
  const media=video.current
  if(!media||failed)return
  void media.play().then(()=>setNeedsPlay(false)).catch(()=>setNeedsPlay(true))
 }

 useEffect(()=>{
  const media=video.current
  if(!media)return
  // Sound stays enabled. Browsers that require a gesture get a Play button;
  // reduced-motion readers choose whether to watch the moving introduction.
  let active=true
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
   void media.play().then(()=>{if(active)setNeedsPlay(false)}).catch(()=>{if(active)setNeedsPlay(true)})
  }
  return()=>{active=false;media.pause()}
 },[])

 useEffect(()=>{
  const handler=(event:KeyboardEvent)=>{
   const target=event.target as HTMLElement|null
   if(event.defaultPrevented||event.repeat||event.ctrlKey||event.metaKey||event.altKey||target?.closest('input,textarea,select,[contenteditable="true"]'))return
   const key=event.key.toLowerCase(),media=video.current
   if(key==='escape'||key==='arrowright'||key==='1'||key===(hotkeys?.choiceA??'1').toLowerCase()){
    event.preventDefault();onDone();return
   }
   if(key===' '||key===(hotkeys?.playPause??'p').toLowerCase()){
    // Let focused native media controls retain their normal keyboard behavior.
    if(target?.closest('video,button'))return
    event.preventDefault()
    if(media&&!failed){if(media.paused)void media.play().catch(()=>setNeedsPlay(true));else media.pause()}
   }
  }
  window.addEventListener('keydown',handler)
  return()=>window.removeEventListener('keydown',handler)
 },[hotkeys,failed,onDone])

 return <section className="episode-intro" aria-label="Episode introduction">
  <div className="episode-intro-heading"><p>Before the story</p><h2>{intro.title}</h2></div>
  <video ref={video} src={import.meta.env.BASE_URL+intro.src} poster={import.meta.env.BASE_URL+intro.poster}
   aria-label={intro.title} controls playsInline preload="auto"
   onPlay={()=>setNeedsPlay(false)} onPause={()=>setNeedsPlay(true)}
   onEnded={onDone} onError={()=>{setFailed(true);setNeedsPlay(false)}}/>
  <div className="episode-intro-actions">
   {needsPlay&&!failed&&<button className="episode-primary" onClick={play}>Play intro with sound</button>}
   <button onClick={onDone}>{failed?'Continue to episode →':'Skip intro →'}</button>
  </div>
  {failed?<p role="status">The intro could not load. You can continue with the story.</p>:<p className="episode-intro-hint">{intro.durationSeconds??6} seconds · Sound on · 1 / →: skip</p>}
 </section>
}
