import {useEffect,useRef,useState} from 'react'
import type {HotkeySettings} from '../../types'
import './episode-context-crawl.css'

export interface EpisodeContext {title:string;paragraphs:string[]}
export function validEpisodeContext(value:EpisodeContext|undefined):value is EpisodeContext {
 return Boolean(value&&typeof value.title==='string'&&value.title.trim()&&Array.isArray(value.paragraphs)&&value.paragraphs.length>=1&&value.paragraphs.length<=2&&value.paragraphs.every(p=>typeof p==='string'&&p.trim()))
}
export default function EpisodeContextCrawl({context,onDone,hotkeys}:{context:EpisodeContext;onDone:()=>void;hotkeys?:HotkeySettings}){
 const text=useRef<HTMLDivElement>(null),animation=useRef<Animation|null>(null)
 const [full,setFull]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches)
 const [paused,setPaused]=useState(false)
 useEffect(()=>{
  if(full)return
  const media=matchMedia('(prefers-reduced-motion: reduce)')
  const reduce=()=>{if(media.matches)setFull(true)}
  const hide=()=>{if(document.hidden){animation.current?.pause();setPaused(true)}}
  try {
   const element=text.current!
   const duration=Math.max(26000,context.paragraphs.join(' ').split(/\s+/).length*380)
   const motion=element.animate([{transform:'translateY(20px)'},{transform:`translateY(-${element.offsetHeight+50}px)`}],{duration,easing:'linear',fill:'forwards'})
   animation.current=motion
   motion.onfinish=()=>setFull(true)
  } catch {setFull(true)}
  media.addEventListener('change',reduce);document.addEventListener('visibilitychange',hide)
  return()=>{animation.current?.cancel();media.removeEventListener('change',reduce);document.removeEventListener('visibilitychange',hide)}
 },[context,full])
 function toggle(){const a=animation.current;if(!a)return;if(a.playState==='paused'){a.play();setPaused(false)}else{a.pause();setPaused(true)}}
 useEffect(()=>{
  const handler=(e:KeyboardEvent)=>{
   if(e.defaultPrevented||e.repeat||e.ctrlKey||e.metaKey||e.altKey||(e.target as HTMLElement)?.closest('input,textarea,select,[contenteditable="true"]'))return
   const key=e.key.toLowerCase()
   if(['1','arrowright','escape',hotkeys?.choiceA?.toLowerCase()].includes(key)){e.preventDefault();onDone()}
   else if(['2',hotkeys?.choiceB?.toLowerCase(),hotkeys?.playPause?.toLowerCase()].includes(key)){e.preventDefault();if(!full)toggle()}
   else if(['3',hotkeys?.choiceC?.toLowerCase()].includes(key)){e.preventDefault();setFull(true)}
  }
  window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler)
 },[hotkeys,full,onDone])
 return <section className={`episode-context ${full?'is-static':''}`} aria-label="Opening context">
  <h2>{context.title}</h2>
  <div className="episode-context-controls">
   <button onClick={onDone}>{full?'Continue to teaser →':'Skip context →'}</button>
   {!full&&<button onClick={toggle}>{paused?'Resume crawl':'Pause crawl'}</button>}
   {!full&&<button onClick={()=>setFull(true)}>Show full text</button>}
  </div>
  <div className="episode-context-window"><div className="episode-context-text" ref={text}>{context.paragraphs.map((p,i)=><p key={i}>{p}</p>)}</div></div>
  <small>1: continue · 2: pause / resume · 3: full text</small>
 </section>
}
