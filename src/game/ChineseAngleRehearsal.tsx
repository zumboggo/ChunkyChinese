import {useEffect,useRef,useState} from 'react'
import StoryStage from './animation/shared/components/StoryStage'
import EpisodeInterlinear from './animation/EpisodeInterlinear'
import {ACTING_PROFILES} from './animation/shared/components/acting-motion'
import type {CharacterOrientation} from './animation/shared/components/character-angles'
import type {StoryState} from './animation/shared/engine/story-engine.js'
import type {ChinesePackage} from './animation/package'
import './chinese-angle-rehearsal.css'
const storage='chunky-chinese-angle-rehearsal-v1'
const defaults={lead:'Hyun',partner:'Kvothe',angle:'three-quarter',cue:'explain',facing:1,shot:'two',prop:'none'}
export default function ChineseAngleRehearsal(){
 const [open,setOpen]=useState(false),[pack,setPack]=useState<ChinesePackage>(),[error,setError]=useState('')
 const [settings,setSettings]=useState<typeof defaults>(()=>{try{return {...defaults,...JSON.parse(localStorage.getItem(storage)||'{}')}}catch{return defaults}})
 const {lead,partner,angle,cue,facing,shot,prop}=settings
 const [run,setRun]=useState(0),[paused,setPaused]=useState(false),[still,setStill]=useState(false),[systemReduced,setSystemReduced]=useState(false),[speaking,setSpeaking]=useState(false)
 const audio=useRef<HTMLAudioElement>(null),resumeAudio=useRef(false)
 const update=(value:Partial<typeof defaults>)=>{audio.current?.pause();setSettings(s=>({...s,...value}))}
 useEffect(()=>{localStorage.setItem(storage,JSON.stringify(settings))},[settings])
 useEffect(()=>{const m=window.matchMedia('(prefers-reduced-motion: reduce)'),change=()=>setSystemReduced(m.matches);change();m.addEventListener('change',change);return()=>m.removeEventListener('change',change)},[])
 useEffect(()=>{if(!open||pack)return;const c=new AbortController();fetch(import.meta.env.BASE_URL+'stories/animated/chinese-angles-v1.json',{signal:c.signal}).then(r=>{if(!r.ok)throw Error('The rehearsal could not load.');return r.json()}).then(setPack).catch(e=>{if(e.name!=='AbortError')setError(e.message)});return()=>c.abort()},[open,pack])
 useEffect(()=>{const hide=()=>{if(document.hidden)audio.current?.pause()};document.addEventListener('visibilitychange',hide);return()=>document.removeEventListener('visibilitychange',hide)},[])
 const text='你愿意？',line=pack?.chinese?.lines[text]
 const emotion=cue==='hesitant'?'worried':cue==='disappointed'?'disappointed':cue==='laugh'?'laughing':cue==='reassure'?'relieved':'neutral'
 const state:StoryState={cursor:run,variables:{},stage:{background:null,camera:{shot,actor:lead,otherActor:partner},actors:{[lead]:{expression:emotion,position:'left',facing,orientation:angle as CharacterOrientation,prop},[partner]:{expression:'curious',position:'right',facing:-1,orientation:'auto'}}},history:[],events:[],seed:1,ended:false}
 return <section className="chinese-angles"><button aria-expanded={open} onClick={()=>{audio.current?.pause();setOpen(!open)}}>Chinese cast · angles and acting</button>{open&&<>
 <h2>同一句话，不同的表演 · Same words, different acting</h2><p>Weed’s Option A, young Kvothe’s troubadour design, and Jonathan’s current robed avatar. Jonathan’s poster likeness is separate. Change a performance while it plays to compare interruptions.</p>
 <div className="angle-controls">
 <label>Speaker<select aria-label="Speaker" value={lead} onChange={e=>update({lead:e.target.value,...(e.target.value===partner?{partner:lead}:{})})}>{['Hyun','Kvothe','Jonathan'].map(id=><option key={id} value={id}>{id==='Hyun'?'Weed':id}</option>)}</select></label>
 <label>Listener<select aria-label="Listener" value={partner} onChange={e=>update({partner:e.target.value})}>{['Hyun','Kvothe','Jonathan'].filter(id=>id!==lead).map(id=><option key={id}>{id}</option>)}</select></label>
 <label>Angle<select aria-label="Angle" value={angle} onChange={e=>update({angle:e.target.value})}>{['auto','front','three-quarter','profile'].map(v=><option key={v}>{v}</option>)}</select></label>
 <label>Facing<select aria-label="Facing" value={facing} onChange={e=>update({facing:Number(e.target.value)})}><option value="1">Right</option><option value="-1">Left</option></select></label>
 <label>Framing<select aria-label="Framing" value={shot} onChange={e=>update({shot:e.target.value})}><option value="two">Conversation</option><option value="close">Close-up</option><option value="wide">Full figure</option></select></label>
 <label>Performance<select aria-label="Performance" value={cue} onChange={e=>{update({cue:e.target.value});setRun(r=>r+1)}}>{Object.keys(ACTING_PROFILES).map(v=><option key={v}>{v}</option>)}</select></label>
 <label>Held object<select aria-label="Held object" value={prop} onChange={e=>update({prop:e.target.value})}>{['none','sword','phone','bow','lance'].map(v=><option key={v}>{v}</option>)}</select></label>
 <button onClick={()=>setRun(r=>r+1)}>Replay performance</button><button onClick={()=>{if(!paused){resumeAudio.current=!!audio.current&&!audio.current.paused;audio.current?.pause()}else if(resumeAudio.current)void audio.current?.play();setPaused(!paused)}}>{paused?'Resume motion':'Pause motion'}</button>
 <label><input type="checkbox" checked={still||systemReduced} disabled={systemReduced} onChange={e=>setStill(e.target.checked)}/>Reduced motion</label>
 </div>{error&&<p role="alert">{error}</p>}
 {pack&&<><audio ref={audio} aria-label="Mandarin rehearsal audio" controls src={line?.audio} onPlay={()=>{setSpeaking(true);setPaused(false)}} onPause={()=>setSpeaking(false)} onEnded={()=>setSpeaking(false)}/><div className="angle-comparisons">{(['classic','polished'] as const).map(style=><section key={style} className="animated-story story-modern"><h3>{style==='classic'?'Earlier timing':'Polished acting'}</h3><StoryStage key={`${lead}-${partner}`} pack={pack} state={state} current={{type:'say',actor:lead,text,gesture:cue}} speaking={speaking} reduced={still||systemReduced} responses={{[lead]:cue}} motionPaused={paused} actingStyle={style}/><div className="story-dialogue"><EpisodeInterlinear text={text} line={line} showPinyin showGloss/></div></section>)}</div></>}
 <p>Props and contact use stable front geometry. Kvothe’s lute stays slung with his cloak. For Continue, saved progress and contact practice, open “Chinese cast · Angles and acting v1” under Practice &amp; demonstrations.</p>
 </>}</section>
}
