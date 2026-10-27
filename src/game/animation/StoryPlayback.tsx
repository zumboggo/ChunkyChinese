import OutcomeScorecard from './OutcomeScorecard.tsx'
import EpisodeAtmosphere from './EpisodeAtmosphere'
import {useEffect,useMemo,useRef,useState,type ReactNode} from 'react'
import {advanceStory,compileStory,replayStory,quizScore,type StoryState} from './shared/engine/story-engine.js'
import StoryStage from './shared/components/StoryStage'
import {playSceneMotion} from './shared/components/scene-motion'
import './shared/components/story-player.css'
import './story-toggles.css'
import type {ChinesePackage} from './package'
import EpisodeInterlinear from './EpisodeInterlinear'
import PocketAudioPlayer from './PocketAudioPlayer'
import AudioModeDialog, {type AudioModeOptions} from './AudioModeDialog'
import {playAudioModeLine,speakAudioMode,waitForAudioMode} from './audioMode'
import type {HotkeySettings} from '../../types'
export interface StoryProgress {continuity?:import('./continuity').ContinuitySnapshot;steps:(string|null)[];quizzes:number[][];seed:number}
export default function StoryPlayback({pack,initial,onProgress,reduced:preferred=false,onComplete,onNextEpisode,preferencesKey='story2:display',hotkeys,settingsContent,onReplayOpening,nextEpisodePreview}:{pack:ChinesePackage;initial?:StoryProgress;onProgress?:(p:StoryProgress)=>void;reduced?:boolean;debug?:boolean;onComplete?:()=>void;onNextEpisode?:()=>void;preferencesKey?:string;hotkeys?:HotkeySettings;settingsContent?:ReactNode;onReplayOpening?:()=>void;nextEpisodePreview?:{number?:number;title:string;teaser:string}}) {
 const compiled=useMemo(()=>compileStory(pack.script,pack.assets),[pack])
 const [progress,setProgress]=useState<StoryProgress>(initial??{steps:[],quizzes:[],seed:1})
 const [state,setState]=useState<StoryState|null>(()=>compiled.story?replayStory(compiled.story,initial?.steps??[],initial?.seed??1):null)
 const [system,setSystem]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),[responses,setResponses]=useState<Record<string,string>>({}),[speaking,setSpeaking]=useState(false),[audioPlaying,setAudioPlaying]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[history,setHistory]=useState(false)
 const preference=<T extends boolean|number,>(name:string,fallback:T):T=>{try{const value=JSON.parse(localStorage.getItem(preferencesKey)??'{}')?.[name];return typeof value===typeof fallback?value:fallback}catch{return fallback}}
 const [voiceVolume,setVoiceVolume]=useState<number>(()=>{const v=preference('voiceVolume',1);return typeof v==='number'&&v>=0&&v<=1?v:1})
 const [motionPaused,setMotionPaused]=useState<boolean>(()=>preference('motionPaused',false))
 const [reduceMotion,setReduceMotion]=useState<boolean>(()=>preference('reduceMotion',false))
 useEffect(()=>{if(sound.current)sound.current.volume=voiceVolume},[voiceVolume])
 const reduced=preferred||system||reduceMotion,root=useRef<HTMLDivElement>(null),generation=useRef(0),lock=useRef(false),sound=useRef<HTMLAudioElement|null>(null)
 const motion=useRef<AbortController|null>(null);
 const current=state&&compiled.story?.nodes[state.cursor]

 const [audioModeOpen,setAudioModeOpen]=useState(false),[audioModeRunning,setAudioModeRunning]=useState(false),[audioModePaused,setAudioModePaused]=useState(false),[audioModeStatus,setAudioModeStatus]=useState('')
 const [audioModeOptions,setAudioModeOptions]=useState<AudioModeOptions>(()=>({chinese:preference('audioModeChinese',true),english:preference('audioModeEnglish',false),englishPause:[0,1,2,3,5,10].includes(preference('audioModeEnglishPause',3))?preference('audioModeEnglishPause',3):3,automaticChoices:preference('audioModeAutomaticChoices',false),choiceDelay:[0,3,5,10].includes(preference('audioModeChoiceDelay',0))?preference('audioModeChoiceDelay',0):0}))
 const [pocketSession,setPocketSession]=useState<{start:StoryProgress;options:AudioModeOptions}|null>(null)
 const audioModeController=useRef<AbortController|null>(null)
 function stopAudioMode(){audioModeController.current?.abort();setAudioModeRunning(false);setAudioModePaused(false);setAudioModeStatus('')}
 function pauseAudioMode(){audioModeController.current?.abort();setAudioModePaused(true)}
 const autoPlay=audioModeOptions.chinese!==false||audioModeOptions.english
 const slideAudioController=useRef<AbortController|null>(null)
 const [showChinese,setShowChinese]=useState<boolean>(()=>preference('chinese',true))
 const [showPinyin,setShowPinyin]=useState<boolean>(()=>preference('pinyin',true)),[showGloss,setShowGloss]=useState<boolean>(()=>preference('english',true)),[answers,setAnswers]=useState<number[]>([-1,-1,-1,-1])
 useEffect(()=>{try{localStorage.setItem(preferencesKey,JSON.stringify({chinese:showChinese,pinyin:showPinyin,english:showGloss,autoplay:autoPlay,voiceVolume,reduceMotion,motionPaused,audioModeChinese:audioModeOptions.chinese!==false,audioModeEnglish:audioModeOptions.english,audioModeEnglishPause:audioModeOptions.englishPause,audioModeAutomaticChoices:audioModeOptions.automaticChoices,audioModeChoiceDelay:audioModeOptions.choiceDelay}))}catch{/* Display preferences are optional on restricted devices. */}},[preferencesKey,showChinese,showPinyin,showGloss,autoPlay,voiceVolume,reduceMotion,motionPaused,audioModeOptions])
 const line=pack.chinese?.lines[current?.text],score=pack.quiz.length===4&&progress.quizzes.length?quizScore(pack.quiz,progress.quizzes.at(-1)!):null
 const latest=useRef({advance:(o:string|null)=>{void advance(o)},back:()=>back(),play:()=>play(),playAuto:()=>play(current?.text,true,true),current,busy});latest.current={advance:(o:string|null)=>{void advance(o)},back:()=>back(),play:()=>play(),playAuto:()=>play(current?.text,true,true),current,busy}
 // Run once for each newly displayed story state, including resumed episodes.
 useEffect(()=>{
  if(pocketSession||audioModeRunning||audioModeOpen||!autoPlay||state?.ended||current?.type==='choice')return;
  const frame=requestAnimationFrame(()=>latest.current.playAuto());
  return()=>{cancelAnimationFrame(frame);slideAudioController.current?.abort();};
 },[autoPlay,state,current,audioModeOptions.chinese,audioModeOptions.english,audioModeOptions.englishPause,audioModeRunning,audioModeOpen,pocketSession])

 // One cancellable listening sequence per scene. Manual navigation and popup edits
 // abort both the recording and the device voice before a new sequence can start.
 useEffect(()=>{
  if(!autoPlay||!audioModeRunning||audioModePaused||audioModeOpen||busy||state?.ended||!current)return
  const controller=new AbortController();audioModeController.current=controller
  const signal=controller.signal
  const listen=async(text:string)=>{
   setAudioModeStatus('Listening…');setAudioPlaying(true)
   setSpeaking(current.type==='say'&&current.actor!=='I')
   try{await playAudioModeLine({text,line:pack.chinese?.lines[text],chinese:audioModeOptions.chinese,english:audioModeOptions.english,pause:audioModeOptions.englishPause,volume:voiceVolume,signal,onAudio:a=>{sound.current=a}})}
   finally{if(!signal.aborted){setAudioPlaying(false);setSpeaking(false)}}
  }
  void (async()=>{
   try{
    if(current.type==='choice'){
     for(let i=0;i<current.options.length;i++){
      await speakAudioMode(audioModeOptions.chinese!==false?`选项 ${i+1}`:`Option ${i+1}`,audioModeOptions.chinese!==false?'zh-CN':'en-US',voiceVolume,signal)
      await listen(current.options[i].text)
     }
     if(!audioModeOptions.automaticChoices){setAudioModeStatus('Choose an option to keep listening.');return}
     const option=current.options[Math.floor(Math.random()*current.options.length)]
     for(let seconds=audioModeOptions.choiceDelay;seconds>0;seconds--){
      setAudioModeStatus(`Choosing automatically in ${seconds}…`)
      await waitForAudioMode(1000,signal)
     }
     if(!signal.aborted)latest.current.advance(option.id)
    }else{
     await listen(current.text??'')
     if(!signal.aborted)latest.current.advance(null)
    }
   }catch(e){if(!signal.aborted){setError(e instanceof Error?e.message:String(e));setAudioModePaused(true)}}
  })()
  return()=>{controller.abort();setAudioPlaying(false);setSpeaking(false);setAudioModeStatus('')}
 },[autoPlay,audioModeRunning,audioModePaused,audioModeOpen,audioModeOptions,busy,state,current,pack,voiceVolume])

 useEffect(()=>{const handler=(e:KeyboardEvent)=>{
  const target=e.target as HTMLElement|null
  if(pocketSession)return
  if(e.defaultPrevented||e.repeat||e.ctrlKey||e.metaKey||e.altKey||target?.closest('input,textarea,select,.episode-chunk,.episode-settings,.story-slide-toggles,dialog,[contenteditable="true"]'))return
  const v=latest.current,key=e.key.toLowerCase()
  if(key==='arrowleft'){e.preventDefault();v.back();return}
  if(key===' '||key===(hotkeys?.playPause??'p').toLowerCase()){e.preventDefault();if(!v.busy)v.play();return}
  const fixed=['1','2','3','4'].indexOf(key)
  const custom=[hotkeys?.choiceA??'1',hotkeys?.choiceB??'2',hotkeys?.choiceC??'3',hotkeys?.choiceD??'4',hotkeys?.choiceE??'5',hotkeys?.choiceF??'6'].findIndex(k=>k.toLowerCase()===key)
  const i=fixed>=0?fixed:custom
  const quiz=root.current?.querySelector('[data-quiz]')
  if(quiz&&fixed>=0){const field=target?.closest('fieldset')??quiz.querySelector('fieldset:not(:has(button[aria-pressed="true"]))');if(field){e.preventDefault();field.querySelectorAll<HTMLButtonElement>('button')[fixed]?.click();return}}
  if(!quiz&&v.current?.type==='choice'&&root.current?.querySelector('.episode-choice')){if(i>=0&&v.current.options[i]){e.preventDefault();if(!v.busy)v.advance(v.current.options[i].id)}return}
  if(key==='arrowright'||key==='1'){e.preventDefault();if(!v.busy)root.current?.querySelector<HTMLButtonElement>('[data-next]:not(:disabled)')?.click()}
 };window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler)},[hotkeys,pocketSession])
 useEffect(()=>{if(initial?.steps.length||!current||!root.current)return;const controller=new AbortController();motion.current=controller;void playSceneMotion(root.current,state?.cues||[],current,reduced,setResponses,controller.signal);return()=>controller.abort();
 // Resume restores held state without replaying transient motion.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[])

 useEffect(()=>{const m=matchMedia('(prefers-reduced-motion: reduce)');const f=()=>setSystem(m.matches);m.addEventListener('change',f);return()=>m.removeEventListener('change',f)},[])
 useEffect(()=>()=>{generation.current++;slideAudioController.current?.abort();motion.current?.abort();sound.current?.pause();root.current?.getAnimations?.({subtree:true}).forEach(a=>a.cancel())},[])
 useEffect(()=>{if(reduced){motion.current?.abort();setResponses({});}},[reduced])
 const animate=async(el:HTMLElement|null,frames:Keyframe[],duration=420)=>{if(reduced||!el?.animate)return;try{await el.animate(frames,{duration,easing:'ease-in-out'}).finished}catch{/* navigation cancellation */}}
 function back(){
  if(!compiled.story||!progress.steps.length)return
  slideAudioController.current?.abort();audioModeController.current?.abort();generation.current++;motion.current?.abort();sound.current?.pause();sound.current=null
  root.current?.getAnimations?.({subtree:true}).forEach(a=>a.cancel())
  lock.current=false;setBusy(false);setSpeaking(false);setAudioPlaying(false);setResponses({});setError('');setAnswers([-1,-1,-1,-1])
  const p={...progress,steps:progress.steps.slice(0,-1)}
  setState(replayStory(compiled.story,p.steps,p.seed));setProgress(p);onProgress?.(p)
 }
 async function advance(option:string|null){
  if(!state||!compiled.story||state.ended||lock.current)return
  slideAudioController.current?.abort();audioModeController.current?.abort();motion.current?.abort();setResponses({});lock.current=true;setBusy(true);sound.current?.pause();sound.current=null;setAudioPlaying(false);setSpeaking(false);setError('');const token=++generation.current
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
 function play(text=current?.text,npc=true,restart=false,standalone=false){
  if(standalone)stopAudioMode()
  if(audioModeRunning&&!standalone){if(audioModePaused){setError('');setAudioModePaused(false)}else pauseAudioMode();return}
  if(!restart&&slideAudioController.current){slideAudioController.current.abort();slideAudioController.current=null;setAudioPlaying(false);setSpeaking(false);return}
  slideAudioController.current?.abort();sound.current?.pause()
  if(!autoPlay||!text){setAudioPlaying(false);setSpeaking(false);return}
  const controller=new AbortController();slideAudioController.current=controller
  setError('');setAudioPlaying(true);setSpeaking(npc&&current?.type==='say'&&current.actor!=='I')
  void playAudioModeLine({text,line:pack.chinese?.lines[text],chinese:audioModeOptions.chinese,english:audioModeOptions.english,pause:audioModeOptions.englishPause,volume:voiceVolume,signal:controller.signal,onAudio:a=>{sound.current=a}})
   .catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:String(e))})
   .finally(()=>{if(slideAudioController.current===controller){slideAudioController.current=null;setAudioPlaying(false);setSpeaking(false)}})
 }


 if(compiled.errors.length||!state)return <div role="alert">{compiled.errors.map(e=><p key={e.line+e.message}>Line {e.line}: {e.message}</p>)}</div>
 if(pocketSession)return <PocketAudioPlayer pack={pack} start={pocketSession.start} options={pocketSession.options} volume={voiceVolume} showChinese={showChinese} showPinyin={showPinyin} showGloss={showGloss} onSave={p=>onProgress?.(p)} onExit={p=>{setProgress(p);setState(replayStory(compiled.story,p.steps,p.seed));onProgress?.(p);setPocketSession(null)}}/>
 return <div className="animated-story story-modern" ref={root} onClick={event=>{
  if(busy||state.ended||current.type==='choice'||window.getSelection()?.toString())return;
  const target=event.target as HTMLElement;
  if(target.closest('button,a,input,select,textarea,label,summary,details,dialog,.reading-controls,.story-atmosphere,footer,aside'))return;
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
  <div className="story-slide-toggles" role="group" aria-label="Story audio and text">
   <div role="group" aria-label="Audio"><span>Audio:</span>
    <button type="button" aria-label="Audio: English" aria-pressed={audioModeOptions.english} onClick={()=>setAudioModeOptions(o=>({...o,english:!o.english}))}>English</button>
    <button type="button" aria-label="Audio: Chinese" aria-pressed={audioModeOptions.chinese!==false} onClick={()=>setAudioModeOptions(o=>({...o,chinese:o.chinese===false}))}>Chinese</button>
   </div>
   <div role="group" aria-label="Text"><span>Text:</span>
    <button type="button" aria-label="Text: Pinyin" aria-pressed={showPinyin} onClick={()=>setShowPinyin(v=>!v)}>Pinyin</button>
    <button type="button" aria-label="Text: Characters" aria-pressed={showChinese} onClick={()=>setShowChinese(v=>!v)}>Characters</button>
    <button type="button" aria-label="Text: English" aria-pressed={showGloss} onClick={()=>setShowGloss(v=>!v)}>English</button>
   </div>
  </div>
  <div className="audio-mode-toolbar">
   <button type="button" aria-haspopup="dialog" onClick={()=>{slideAudioController.current?.abort();sound.current?.pause();audioModeController.current?.abort();setAudioModeOpen(true)}}>Audio Mode</button>
   {audioModeRunning&&!state.ended&&<button type="button" onClick={()=>{if(audioModePaused){setError('');setAudioModePaused(false)}else pauseAudioMode()}}>{audioModePaused?'Resume Audio Mode':'Pause Audio Mode'}</button>}
   {audioModeRunning&&<span role="status">{state.ended?'Episode complete':audioModePaused?'Audio Mode paused':audioModeStatus}</span>}
  </div>
  <AudioModeDialog onPocket={()=>{stopAudioMode();generation.current++;lock.current=false;setBusy(false);sound.current?.pause();motion.current?.abort();setAudioModeOpen(false);setPocketSession({start:progress,options:{...audioModeOptions}})}} open={audioModeOpen} running={audioModeRunning} options={audioModeOptions} onOptions={setAudioModeOptions} showChinese={showChinese} showPinyin={showPinyin} showGloss={showGloss} onChinese={setShowChinese} onPinyin={setShowPinyin} onGloss={setShowGloss} onClose={()=>setAudioModeOpen(false)} onStart={()=>{setError('');setAudioModePaused(false);setAudioModeRunning(true);setAudioModeOpen(false)}} onStop={()=>{stopAudioMode();setAudioModeOpen(false)}}/>
  <details className="episode-settings" onKeyDown={e=>{if(e.key==='Escape'){e.currentTarget.open=false;e.currentTarget.querySelector('summary')?.focus();}}}>
   <summary>Settings</summary><div className="episode-settings-panel">
   {settingsContent}
  {!state.ended&&<EpisodeAtmosphere preferencesKey={preferencesKey+':sound'} root={root} preset={state.ended?'none':state.stage.ambience} ducked={audioPlaying&&voiceVolume>0} voiceVolume={voiceVolume} onVoiceVolume={setVoiceVolume}/>}
   <fieldset className="chunk-view-settings"><legend>Default view</legend><p>Show these before you tap a chunk. Turn all three off for listening practice:</p>
    <label><input type="checkbox" checked={showChinese} onChange={e=>setShowChinese(e.target.checked)}/> Characters</label>
    <label><input type="checkbox" checked={showPinyin} onChange={e=>setShowPinyin(e.target.checked)}/> Pinyin</label>
    <label><input type="checkbox" checked={showGloss} onChange={e=>setShowGloss(e.target.checked)}/> English</label>
    <p><strong>Revealed view:</strong> tap a chunk to add the hidden characters, pinyin, or English. Tap again to return to your default view.</p>
   </fieldset>

   {onReplayOpening&&<button onClick={onReplayOpening}>Replay opening</button>}
   <label><input type="checkbox" checked={motionPaused} onChange={e=>setMotionPaused(e.target.checked)}/> Pause scene motion</label>
   <label><input type="checkbox" checked={reduceMotion} onChange={e=>setReduceMotion(e.target.checked)}/> Reduce motion</label>
   </div></details>
  <StoryStage pack={pack} state={state} current={current} speaking={speaking&&!state.ended} reduced={reduced} responses={responses} motionPaused={motionPaused}/>
  <div className="story-meters">{Object.entries(compiled.story.variables).filter(([,v])=>(v as {visible:boolean}).visible).map(([id])=><span key={id}>{id}: {String(state.variables[id])}</span>)}</div>
  <section className="story-dialogue" aria-live="polite">{state.ended?<>{pack.outcomeScorecard&&<OutcomeScorecard definition={pack.outcomeScorecard} state={state}/>}<h2>{pack.quiz.length===4?(score!==null&&score>=75?'Complete':'Four questions before we return'):'Scene complete'}</h2>{pack.quiz.length===4&&<>{score!==null&&<p>{score}/100 · {score>=75?'Complete':'Review and retry'}</p>}{(score===null||score<75)&&<><div data-quiz>{pack.quiz.map((q,i)=><fieldset key={i}><legend>{q.prompt}</legend>{q.options.map((o,j)=><button key={j} aria-pressed={answers[i]===j} onClick={()=>setAnswers(answers.map((a,k)=>k===i?j:a))}>{j+1}. {o}</button>)}{score!==null&&<p>{q.explanation}</p>}</fieldset>)}</div><button data-next disabled={answers.includes(-1)} onClick={()=>{const p={...progress,quizzes:[...progress.quizzes,answers]};setProgress(p);onProgress?.(p);setAnswers([-1,-1,-1,-1])}}>Check answers</button></>}</>}{onNextEpisode&&(pack.quiz.length!==4||(score!==null&&score>=75))&&<div className="episode-up-next"><p className="game-kicker">UP NEXT</p>{nextEpisodePreview&&<><h3>{nextEpisodePreview.title}</h3><p>{nextEpisodePreview.teaser}</p></>}<button className="next-episode" data-next onClick={onNextEpisode}>Continue to {nextEpisodePreview?.number?`Episode ${nextEpisodePreview.number}`:'next episode'} →</button></div>}{onComplete&&<button data-next onClick={onComplete}>Continue to the conversation</button>}</>:current.type==='choice'?<><h2>What do I do?</h2>{current.options.map((o:{id:string;text:string},i:number)=><div className="episode-choice-card" key={o.id}><EpisodeInterlinear text={o.text} line={pack.chinese?.lines[o.text]} showChinese={showChinese} showPinyin={showPinyin} showGloss={showGloss} interactive/><button className="episode-choice" aria-label={`Choose option ${i+1}`} data-next disabled={busy} onClick={()=>void advance(o.id)}>Choose {i+1}</button>{autoPlay&&<button className="audio-play" aria-label={'Hear option: '+o.text} onClick={()=>play(o.text,false,false,true)}><PlayIcon/></button>}</div>)}</>:<><strong>{current.type==='act'||current.beat?'On the scene':current.actor==='I'?'My story':pack.assets.characters[current.actor]?.name}</strong><div className="episode-line"><EpisodeInterlinear key={state.cursor} text={current.text} line={line} showChinese={showChinese} showPinyin={showPinyin} showGloss={showGloss} interactive/></div>{autoPlay&&<button className="audio-play" aria-label={audioPlaying?"Pause audio":"Play audio"} title="Play / pause (Space)" onClick={()=>play()}>{audioPlaying?'Pause':<PlayIcon/>}</button>}<button data-next disabled={busy} onClick={()=>void advance(null)}>{busy?'Action playing…':'Continue →'}</button></>}{error&&<p role="status">{error}</p>}</section>

  <footer><p className="game-key-hints">1–4: choose · Space: play / pause · ←: back · → or 1: continue</p><button aria-expanded={history} onClick={()=>setHistory(!history)}>Recall the conversation</button></footer>{history&&<aside>{state.history.map((h,i)=><p key={i}>{pack.assets.characters[h.actor]?.name??'I'}: {h.text}</p>)}</aside>}
 </div>
}

function PlayIcon(){return <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M8 4v16l13-8z"/></svg>}
