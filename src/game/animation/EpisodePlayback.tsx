import {useState,type ComponentProps} from 'react'
import StoryPlayback from './StoryPlayback'
import EpisodeIntro from './EpisodeIntro'
import type {EpisodeIntroMedia} from './storage'

/** Introductions are presentation media, outside immutable episode packages and
 * saved story steps. Story audio and motion do not mount until the intro ends. */
export default function EpisodePlayback({intro,...storyProps}:ComponentProps<typeof StoryPlayback>&{intro?:EpisodeIntroMedia}){
 const [introFinished,setIntroFinished]=useState(!intro||Boolean(storyProps.initial?.steps.length))
 if(intro&&!introFinished)return <EpisodeIntro intro={intro} hotkeys={storyProps.hotkeys} onDone={()=>setIntroFinished(true)}/>
 return <StoryPlayback {...storyProps}/>
}
