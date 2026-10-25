import {useState,type ComponentProps} from 'react'
import StoryPlayback from './StoryPlayback'
import EpisodeIntro from './EpisodeIntro'
import type {EpisodeIntroMedia} from './storage'

/** Keep the latest story position when replaying the opening film. */
export default function EpisodePlayback({intro,onRestartEpisode,...storyProps}:ComponentProps<typeof StoryPlayback>&{intro?:EpisodeIntroMedia;onRestartEpisode?:()=>void}){
 const [introFinished,setIntroFinished]=useState(!intro||Boolean(storyProps.initial?.steps.length))
 const [progress,setProgress]=useState(storyProps.initial)
 const [introReplay,setIntroReplay]=useState(0)
 function replayIntro(){setIntroReplay(n=>n+1);setIntroFinished(false)}
 return <>
  <nav className="episode-restart-controls" aria-label="Episode controls">
   {onRestartEpisode&&<button onClick={onRestartEpisode}>Restart episode</button>}
   {intro&&<button onClick={replayIntro}>Restart intro</button>}
  </nav>
  {intro&&!introFinished?<EpisodeIntro key={introReplay} intro={intro} hotkeys={storyProps.hotkeys} onDone={()=>setIntroFinished(true)}/>:<StoryPlayback {...storyProps} initial={progress} onProgress={p=>{setProgress(p);storyProps.onProgress?.(p)}} onReplayOpening={intro?replayIntro:undefined}/>}
 </>
}
