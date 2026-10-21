import StoryAtmosphere from './shared/components/StoryAtmosphere'
import {useEffect,useMemo,useRef,useState} from 'react'
import {advanceStory,compileStory,replayStory,quizScore,type StoryState} from './shared/engine/story-engine.js'
import StoryStage from './shared/components/StoryStage'
import {playSceneMotion} from './shared/components/scene-motion'
import './shared/components/story-player.css'
import type {ChinesePackage} from './package'
import EpisodeInterlinear from './EpisodeInterlinear'
import type {HotkeySettings} from '../../types'
export interface StoryProgress {steps:(string|null)[];quizzes:number[][];seed:number}
export default function StoryPlayback({pack,initial,onProgress,reduced:preferred=false,onComplete,onNextEpisode,preferencesKey='story2:display',hotkeys}:{pack:ChinesePackage;initial?:StoryProgress;onProgress?:(p:StoryProgress)=>void;reduced?:boolean;debug?:boolean;onComplete?:()=>void;onNextEpisode?:()=>void;preferencesKey?:string;hotkeys?:HotkeySettings}) {
 const compiled=useMemo(()=>compileStory(pack.script,pack.assets),[pack])
 const [progress,setProgress]=useState<StoryProgress>(initial??{steps:[],quizzes:[],seed:1})
 const [state,setState]=useState<StoryState|null>(()=>compiled.story?replayStory(compiled.story,initial?.steps??[],initial?.seed??1):null)
 const [system,setSystem]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),[responses,setResponses]=useState<Record<string,string>>({}),[speaking,setSpeaking]=useState(false),[audioPlaying,setAudioPlaying]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[history,setHistory]=useState(false)
 const [voiceVolume,setVoiceVolume]=useState(1)
 useEffect(()=>{if(sound.current)sound.current.volume=voiceVolume},[voiceVolume])
 const reduced=preferred||system,root=useRef<HTMLDivElement>(null),generation=useRef(0),lock=useRef(false),sound=useRef<HTMLAudioElement|null>(null)
 const motion=useRef<AbortController|null>(null);
 const current=state&&compiled.story?.nodes[state.cursor]
 const preference=(name:string,fallback=true)=>{try{return JSON.parse(localStorage.getItem(preferencesKey)??'{}')[name]??fallback}catch{return fallback}}
 const [autoPlay,setAutoPlay]=useState(()=>preference('autoplay',false))
 const [showPinyin,setShowPinyin]=useState(()=>preference('pinyin')),[showGloss,setShowGloss]=useState(()=>preference('english')),[answers,setAnswers]=useState<number[]>([-1,-1,-1,-1])
 useEffect(()=>{try{localStorage.setItem(preferencesKey,JSON.stringify({pinyin:showPinyin,english:showGloss,autoplay:autoPlay}))}catch{/* Display preferences are optional on restricted devices. */}},[preferencesKey,showPinyin,showGloss,autoPlay])
 const line=pack.chinese?.lines[current?.text],score=pack.quiz.length===4&&progress.quizzes.length?quizScore(pack.quiz,progress.quizzes.at(-1)!):null
 const latest=useRef({advance:(o:string|null)=>{void advance(o)},play:()=>play(),playAuto:()=>play(current?.text,true,true),current,busy});latest.current={advance:(o:string|null)=>{void advance(o)},play:()=>play(),playAuto:()=>play(current?.text,true,true),current,busy}
 // Run once for each newly displayed story state, including resumed episodes.
 useEffect(()=>{
  if(!autoPlay||state?.ended||current?.type==='choice'||!line?.audio)return;
  const frame=requestAnimationFrame(()=>latest.current.playAuto());
  return()=>cancelAnimationFrame(frame);
 },[autoPlay,state,current,line?.audio])
 useEffect(()=>{const handler=(e:KeyboardEvent)=>{
  const target=e.target as HTMLElement|null
  if(e.defaultPrevented||e.repeat||e.ctrlKey||e.metaKey||e.altKey||target?.closest('input,textarea,select,[contenteditable="true"]'))return
  const v=latest.current,key=e.key.toLowerCase()
  if(key===' '||key===(hotkeys?.playPause??'p').toLowerCase()){e.preventDefault();if(!v.busy)v.play();return}
  const fixed=['1','2','3','4'].indexOf(key)
  const custom=[hotkeys?.choiceA??'1',hotkeys?.choiceB??'2',hotkeys?.choiceC??'3',hotkeys?.choiceD??'4',hotkeys?.choiceE??'5',hotkeys?.choiceF??'6'].findIndex(k=>k.toLowerCase()===key)
  const i=fixed>=0?fixed:custom
  const quiz=root.current?.querySelector('[data-quiz]')
  if(quiz&&fixed>=0){const field=target?.closest('fieldset')??quiz.querySelector('fieldset:not(:has(button[aria-pressed="true"]))');if(field){e.preventDefault();field.querySelectorAll<HTMLButtonElement>('button')[fixed]?.click();return}}
  if(!quiz&&v.current?.type==='choice'&&root.current?.querySelector('.episode-choice')){if(i>=0&&v.current.options[i]){e.preventDefault();if(!v.busy)v.advance(v.current.options[i].id)}return}
  if(key==='arrowright'||key==='1'){e.preventDefault();if(!v.busy)root.current?.querySelector<HTMLButtonElement>('[data-next]:not(:disabled)')?.click()}
 };window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler)},[hotkeys])
 useEffect(()=>{if(initial?.steps.length||!current||!root.current)return;const controller=new AbortController();motion.current=controller;void playSceneMotion(root.current,state?.cues||[],current,reduced,setResponses,controller.signal);return()=>controller.abort();
 // Resume restores held state without replaying transient motion.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[])

 useEffect(()=>{const m=matchMedia('(prefers-reduced-motion: reduce)');const f=()=>setSystem(m.matches);m.addEventListener('change',f);return()=>m.removeEventListener('change',f)},[])
 useEffect(()=>()=>{generation.current++;motion.current?.abort();sound.current?.pause();root.current?.getAnimations?.({subtree:true}).forEach(a=>a.cancel())},[])
 useEffect(()=>{if(reduced){motion.current?.abort();setResponses({});}},[reduced])
 const animate=async(el:HTMLElement|null,frames:Keyframe[],duration=420)=>{if(reduced||!el?.animate)return;try{await el.animate(frames,{duration,easing:'ease-in-out'}).finished}catch{/* navigation cancellation */}}
 async function advance(option:string|null){
  if(!state||!compiled.story||state.ended||lock.current)return
  motion.current?.abort();setResponses({});lock.current=true;setBusy(true);sound.current?.pause();sound.current=null;setAudioPlaying(false);setSpeaking(false);setError('');const token=++generation.current
  try{
   const next=advanceStory(compiled.story,state,option)
   for(const id of Object.keys(state.stage.actors)){if(!next.stage.actors[id])await animate(root.current?.querySelector(`[data-actor="${id}"]`)??null,[{opacity:1,transform:'translateX(0)'},{opacity:0,transform:'translateX(65px)'}]);if(token!==generation.current)return}
   const p={...progress,steps:[...progress.steps,option]};setState(next);setProgress(p);onProgress?.(p)
   await new Promise<void>(r=>requestAnimationFrame(()=>r()))
   if(token!==generation.current)return;
   const controller=new AbortController();motion.current=controller;
   const cues=(next.cues||[]).map(n=>({...n,entering:n.type==='show'&&!state.stage.actors[n.actor]}));
   if(root.current)void playSceneMotion(root.current,cues,compiled.story.nodes[next.cursor],reduced,setResponses,controller.signal);

  }finally{if(token===generation.current){lock.current=false;setBusy(false);root.current?.querySelector<HTMLButtonElement>('[data-next]')?.focus({preventScroll:true})}}
 }
 function play(text=current?.text,npc=true,restart=false){const clip=pack.chinese?.lines[text]?.audio??(text==null?sound.current?.getAttribute('src'):undefined);if(!clip)return;if(!restart&&sound.current?.getAttribute('src')===clip){const a=sound.current;if(!a.paused){a.pause();return}if(!a.ended){void a.play().catch(()=>setError('Audio could not play. Try Play again or continue with the text.'));return}}sound.current?.pause();setSpeaking(false);const a=new Audio(clip);a.volume=voiceVolume;sound.current=a;const active=()=>sound.current===a;a.onplaying=()=>{if(active()){setAudioPlaying(true);setSpeaking(npc&&current?.type==='say'&&current.actor!=='I')}};a.onpause=a.onended=()=>{if(active()){setSpeaking(false);setAudioPlaying(false)}};a.onerror=()=>{if(active()){setSpeaking(false);setAudioPlaying(false);setError('Audio unavailable. You can continue with the text.')}};void a.play().catch(()=>{if(active()){setSpeaking(false);setAudioPlaying(false);setError('Audio could not play. Try Play again or continue with the text.')}})}

 if(compiled.errors.length||!state)return <div role="alert">{compiled.errors.map(e=><p key={e.line+e.message}>Line {e.line}: {e.message}</p>)}</div>
 return <div className="animated-story story-modern" ref={root} onClick={event=>{
  if(busy||state.ended||current.type==='choice'||window.getSelection()?.toString())return;
  const target=event.target as HTMLElement;
  if(target.closest('button,a,input,select,textarea,label,summary,details,.reading-controls,.story-atmosphere,footer,aside'))return;
  const surface=target.closest('.story-stage,.story-dialogue');
  if(!surface)return;
  const bounds=surface.getBoundingClientRect();
  if(event.clientX<bounds.left+bounds.width*.65)return;
  // Only empty panel space: text and characters retain their normal interactions.
  if(surface.classList.contains('story-stage')&&target!==surface&&!target.classList.contains('story-environment')&&!target.classList.contains('story-camera'))return;
  const textNodes=document.createTreeWalker(target,NodeFilter.SHOW_TEXT);
  while(textNodes.nextNode()){
   const range=document.createRange();range.selectNodeContents(textNodes.currentNode);
   if(Array.from(range.getClientRects()).some(rect=>event.clientX>=rect.left&&event.clientX<=rect.right&&event.clientY>=rect.top&&event.clientY<=rect.bottom))return;
  }
  void advance(null);
 }}>
  {!state.ended&&<StoryAtmosphere root={root} preset={state.ended?'none':state.stage.ambience} ducked={audioPlaying&&voiceVolume>0} voiceVolume={voiceVolume} onVoiceVolume={setVoiceVolume}/>}
  {!state.ended&&<div className="reading-controls" aria-label="Reading aids"><button aria-label="Play" title="Automatically play voice when text appears" aria-pressed={autoPlay} onClick={()=>{setAutoPlay(!autoPlay);if(autoPlay){sound.current?.pause();setSpeaking(false);setAudioPlaying(false)}}}>Play <span aria-hidden="true">{autoPlay?'●':'○'}</span></button><button aria-label="English" aria-pressed={showGloss} onClick={()=>setShowGloss(!showGloss)}>English <span aria-hidden="true">{showGloss?'●':'○'}</span></button><button aria-label="Pinyin" aria-pressed={showPinyin} onClick={()=>setShowPinyin(!showPinyin)}>Pinyin <span aria-hidden="true">{showPinyin?'●':'○'}</span></button></div>}
  <StoryStage pack={pack} state={state} current={current} speaking={speaking&&!state.ended} reduced={reduced} responses={responses}/>
  <div className="story-meters">{Object.entries(compiled.story.variables).filter(([,v])=>(v as {visible:boolean}).visible).map(([id])=><span key={id}>{id}: {String(state.variables[id])}</span>)}</div>
  <section className="story-dialogue" aria-live="polite">{state.ended?<><h2>{pack.quiz.length===4?(score!==null&&score>=75?'Complete':'Four questions before we return'):'Scene complete'}</h2>{pack.quiz.length===4&&<>{score!==null&&<p>{score}/100 · {score>=75?'Complete':'Review and retry'}</p>}{(score===null||score<75)&&<><div data-quiz>{pack.quiz.map((q,i)=><fieldset key={i}><legend>{q.prompt}</legend>{q.options.map((o,j)=><button key={j} aria-pressed={answers[i]===j} onClick={()=>setAnswers(answers.map((a,k)=>k===i?j:a))}>{j+1}. {o}</button>)}{score!==null&&<p>{q.explanation}</p>}</fieldset>)}</div><button data-next disabled={answers.includes(-1)} onClick={()=>{const p={...progress,quizzes:[...progress.quizzes,answers]};setProgress(p);onProgress?.(p);setAnswers([-1,-1,-1,-1])}}>Check answers</button></>}</>}{onNextEpisode&&(pack.quiz.length!==4||(score!==null&&score>=75))&&<button className="next-episode" data-next onClick={onNextEpisode}>Next Episode →</button>}{onComplete&&<button data-next onClick={onComplete}>Continue to the conversation</button>}</>:current.type==='choice'?<><h2>What do I do?</h2>{current.options.map((o:{id:string;text:string},i:number)=><div key={o.id}><button className="episode-choice" aria-label={o.text} data-next disabled={busy} onClick={()=>void advance(o.id)}><span aria-hidden="true">{i+1}. </span><EpisodeInterlinear text={o.text} line={pack.chinese?.lines[o.text]} showPinyin={showPinyin} showGloss={showGloss}/></button>{pack.chinese?.lines[o.text]?.audio&&<button className="audio-play" aria-label={'Hear option: '+o.text} onClick={()=>play(o.text,false)}><PlayIcon/></button>}</div>)}</>:<><strong>{current.type==='act'||current.beat?'On the scene':current.actor==='I'?'My story':pack.assets.characters[current.actor]?.name}</strong>{line?.interlinear?.length?<div className="episode-line"><EpisodeInterlinear text={current.text} line={line} showPinyin={showPinyin} showGloss={showGloss}/></div>:<><p className={/[\u3400-\u9fff]/u.test(current.text)?'chinese-line':undefined} lang={/[\u3400-\u9fff]/u.test(current.text)?'zh-CN':undefined}>{current.text}</p>{showPinyin&&line?.pinyin&&<p className="pinyin">{line.pinyin}</p>}</>}{showGloss&&line?.english&&!!line.interlinear?.length&&<details className="sentence-translation"><summary>Sentence meaning</summary><p>{line.english}</p></details>}{showGloss&&line?.english&&!line.interlinear?.length&&<p className="sentence-meaning">{line.english}</p>}{line?.audio&&<button className="audio-play" aria-label={audioPlaying?"Pause audio":"Play audio"} title="Play / pause (Space)" onClick={()=>play()}>{audioPlaying?'Pause':<PlayIcon/>}</button>}<button data-next disabled={busy} onClick={()=>void advance(null)}>{busy?'Action playing…':'Continue →'}</button></>}{error&&<p role="status">{error}</p>}</section>

  <footer><p className="game-key-hints">1–4: choose · Space: play / pause · → or 1: continue</p><button aria-expanded={history} onClick={()=>setHistory(!history)}>Recall the conversation</button></footer>{history&&<aside>{state.history.map((h,i)=><p key={i}>{pack.assets.characters[h.actor]?.name??'I'}: {h.text}</p>)}</aside>}
 </div>
}

function PlayIcon(){return <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M8 4v16l13-8z"/></svg>}
