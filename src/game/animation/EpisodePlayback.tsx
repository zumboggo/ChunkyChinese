import {useState,type ComponentProps} from 'react'
import StoryPlayback from './StoryPlayback'
import EpisodeIntro from './EpisodeIntro'
import type {EpisodeIntroMedia} from './storage'

/** Keep the latest story position when replaying the opening film. */
export default function EpisodePlayback({intro,...storyProps}:ComponentProps<typeof StoryPlayback>&{intro?:EpisodeIntroMedia}){
 const [introFinished,setIntroFinished]=useState(!intro||Boolean(storyProps.initial?.steps.length))
 const [progress,setProgress]=useState(storyProps.initial)
 if(intro&&!introFinished)return <EpisodeIntro intro={intro} hotkeys={storyProps.hotkeys} onDone={()=>setIntroFinished(true)}/>
 return <StoryPlayback {...storyProps} initial={progress} onProgress={p=>{setProgress(p);storyProps.onProgress?.(p)}} onReplayOpening={intro?()=>setIntroFinished(false):undefined}/>
}
