import {useEffect, useRef, type ComponentProps} from 'react'
import EpisodePlayback from './animation/EpisodePlayback'
import {compileStory, replayStory} from './animation/shared/engine/story-engine.js'
import {continuityScript} from './animation/continuity'
import type {StoryProgress} from './animation/StoryPlayback'
import {getDB, recordEvent} from '../db'
import {activeElapsedSeconds} from './episodeActivity'

export default function TrackedEpisode({releaseId, ...props}: ComponentProps<typeof EpisodePlayback> & {releaseId:string}) {
 const flushRef=useRef<()=>void>(()=>{})
 const done=useRef(false)
 const ended=(p:StoryProgress)=>{
  const compiled=compileStory(continuityScript(props.pack.script,props.pack.continuity,p.continuity),props.pack.assets)
  return Boolean(compiled.story && replayStory(compiled.story,p.steps,p.seed).ended)
 }
 const initial=props.initial
 const attemptId=initial?.attemptId
 const title=props.pack.title
 const partialTiming=initial?.partialTiming
 useEffect(()=>{
  done.current=initial?ended(initial):false
  let last=Date.now(), activity=last, visible=!document.hidden
  const flush=()=>{
   const now=Date.now()
   const seconds=done.current?0:activeElapsedSeconds(last,now,activity,visible)
   last=now
   if(seconds>0)void recordEvent({type:'play',source:'game',itemType:'lesson',itemId:releaseId,sessionId:attemptId,episodeTitle:title,partialTiming,seconds}).then(()=>window.dispatchEvent(new Event('episode-activity'))).catch(()=>window.dispatchEvent(new Event('episode-activity-error')))
  }
  flushRef.current=flush
  const interact=()=>{flush();activity=Date.now()}
  const visibility=()=>{flush();visible=!document.hidden;if(visible)activity=Date.now()}
  const interval=window.setInterval(flush,5000)
  window.addEventListener('pointerdown',interact)
  window.addEventListener('keydown',interact)
  window.addEventListener('wheel',interact,{passive:true})
  document.addEventListener('visibilitychange',visibility)
  window.addEventListener('pagehide',flush)
  return()=>{flush();clearInterval(interval);window.removeEventListener('pointerdown',interact);window.removeEventListener('keydown',interact);window.removeEventListener('wheel',interact);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',flush)}
 // Each playback is keyed by GamePage; progress updates must not reset the clock.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[])
 return <EpisodePlayback {...props} onProgress={p=>{
  props.onProgress?.(p)
  if(!done.current&&ended(p)){
   flushRef.current();done.current=true
   void getDB().then(db=>db.put('listeningEvents',{id:`episode-complete:${attemptId}`,timestamp:new Date().toISOString(),type:'complete',source:'game',itemType:'lesson',itemId:releaseId,sessionId:attemptId,episodeTitle:title,partialTiming,seconds:0})).then(()=>{window.dispatchEvent(new Event('episode-activity'));window.dispatchEvent(new Event('episode-completed'))}).catch(()=>window.dispatchEvent(new Event('episode-activity-error')))
  }
 }}/>
}
