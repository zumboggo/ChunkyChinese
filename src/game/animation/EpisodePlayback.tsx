import EpisodeContinuity,{ContinuitySummary} from './EpisodeContinuity'
import {continuityScript,validSnapshot,type ContinuitySnapshot} from './continuity'
import {useMemo,useRef,useState,type ComponentProps} from 'react'
import StoryPlayback from './StoryPlayback'
import EpisodeIntro from './EpisodeIntro'
import EpisodeContextCrawl,{validEpisodeContext} from './EpisodeContextCrawl'
import type {EpisodeIntroMedia} from './storage'

/** Keep the latest story position when replaying the opening film. */
export default function EpisodePlayback({intro,onRestartEpisode,onBack,inherited,...storyProps}:ComponentProps<typeof StoryPlayback>&{intro?:EpisodeIntroMedia;onBack?:()=>void;onRestartEpisode?:()=>void;inherited?:ContinuitySnapshot}){
 const [accepted,setAccepted]=useState(!storyProps.pack.notice||Boolean(storyProps.initial?.steps.length))
 const [introFinished,setIntroFinished]=useState(!intro||Boolean(storyProps.initial?.steps.length))
 const context=validEpisodeContext(intro?.context)?intro.context:undefined
 const [contextFinished,setContextFinished]=useState(Boolean(storyProps.initial?.steps.length))
 const [progress,setProgress]=useState(storyProps.initial)
 const [introReplay,setIntroReplay]=useState(0)
 const moreMenu=useRef<HTMLDetailsElement>(null)
 const boundPack=useMemo(()=>({...storyProps.pack,script:continuityScript(storyProps.pack.script,storyProps.pack.continuity,progress?.continuity)}),[storyProps.pack,progress?.continuity])
 function replayIntro(){if(moreMenu.current)moreMenu.current.open=false;setIntroReplay(n=>n+1);setIntroFinished(false);setContextFinished(false)}
 function confirmContinuity(snapshot:ContinuitySnapshot){const next={...(progress??{steps:[],quizzes:[],seed:1}),continuity:snapshot};setProgress(next);storyProps.onProgress?.(next)}
 const header=(<header className="cinema-header">{onBack&&<button className="cinema-back" aria-label="← Story library" onClick={onBack}>‹</button>}<h1>{storyProps.pack.title.replace(/^(?:Moonlight Sculptor|The Name of the Wind)\s*\d+\s*·\s*/i,'')}</h1><details ref={moreMenu} className="cinema-more" onKeyDown={event=>{if(event.key==='Escape'){event.currentTarget.open=false;event.currentTarget.querySelector('summary')?.focus()}}}><summary aria-label="Episode options">···</summary><nav className="episode-restart-controls" aria-label="Episode controls">{onRestartEpisode&&<button onClick={()=>{onRestartEpisode()}}>Restart episode</button>}{intro&&<button onClick={()=>{replayIntro()}}>Restart intro</button>}</nav></details></header>)
 if(!accepted)return <>{header}<section className="story-disclaimer" aria-label="About this adaptation"><h2>Before you begin</h2><p>{storyProps.pack.notice}</p><button onClick={()=>setAccepted(true)}>Accept</button></section></>
 if(storyProps.pack.continuity&&!validSnapshot(storyProps.pack.continuity,progress?.continuity))return <>{header}<EpisodeContinuity definition={storyProps.pack.continuity} initial={inherited} hotkeys={storyProps.hotkeys} onDone={confirmContinuity}/></>
 return <>
  {header}
  {storyProps.pack.continuity&&progress?.continuity&&<details className="episode-continuity"><summary>Carried forward from Episode {Number(storyProps.pack.continuity.sourceId.match(/-(\d+)-/)?.[1])||'previous'}</summary><ContinuitySummary definition={storyProps.pack.continuity} snapshot={progress.continuity}/></details>}
  {context&&!contextFinished?<EpisodeContextCrawl key={introReplay} context={context} hotkeys={storyProps.hotkeys} onDone={()=>setContextFinished(true)}/>:intro&&!introFinished?<EpisodeIntro key={introReplay} intro={intro} hotkeys={storyProps.hotkeys} onDone={()=>setIntroFinished(true)}/>:<StoryPlayback {...storyProps} pack={boundPack} initial={progress} onProgress={p=>{setProgress(p);storyProps.onProgress?.(p)}} onReplayOpening={intro?replayIntro:undefined}/>}
 </>
}
