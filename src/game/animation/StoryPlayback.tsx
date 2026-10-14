import {useEffect,useMemo,useRef,useState} from 'react'
import {advanceStory,compileStory,replayStory,quizScore,type StoryState} from './shared/engine/story-engine.js'
import StoryStage from './shared/components/StoryStage'
import {performAction} from './shared/components/action-motion'
import './shared/components/story-player.css'
import type {ChinesePackage} from './package'
import EpisodeInterlinear from './EpisodeInterlinear'
import type {HotkeySettings} from '../../types'
export interface StoryProgress {steps:(string|null)[];quizzes:number[][];seed:number}
export default function StoryPlayback({pack,initial,onProgress,reduced:preferred=false,onComplete,onNextEpisode,preferencesKey='story2:display',hotkeys}:{pack:ChinesePackage;initial?:StoryProgress;onProgress?:(p:StoryProgress)=>void;reduced?:boolean;debug?:boolean;onComplete?:()=>void;onNextEpisode?:()=>void;preferencesKey?:string;hotkeys?:HotkeySettings}) {
 const compiled=useMemo(()=>compileStory(pack.script,pack.assets),[pack])
 const [progress,setProgress]=useState<StoryProgress>(initial??{steps:[],quizzes:[],seed:1})
 const [state,setState]=useState<StoryState|null>(()=>compiled.story?replayStory(compiled.story,initial?.steps??[],initial?.seed??1):null)
 const [system,setSystem]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),[responses,setResponses]=useState<Record<string,string>>({}),[speaking,setSpeaking]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[history,setHistory]=useState(false)
 const reduced=preferred||system,root=useRef<HTMLDivElement>(null),generation=useRef(0),lock=useRef(false),sound=useRef<HTMLAudioElement|null>(null)
 const current=state&&compiled.story?.nodes[state.cursor]
 const preference=(name:string)=>{try{return JSON.parse(localStorage.getItem(preferencesKey)??'{}')[name]!==false}catch{return true}}
 const [showPinyin,setShowPinyin]=useState(()=>preference('pinyin')),[showGloss,setShowGloss]=useState(()=>preference('english')),[answers,setAnswers]=useState<number[]>([-1,-1,-1,-1])
 useEffect(()=>{try{localStorage.setItem(preferencesKey,JSON.stringify({pinyin:showPinyin,english:showGloss}))}catch{/* Display preferences are optional on restricted devices. */}},[preferencesKey,showPinyin,showGloss])
 const line=pack.chinese?.lines[current?.text],score=pack.quiz.length===4&&progress.quizzes.length?quizScore(pack.quiz,progress.quizzes.at(-1)!):null
 const latest=useRef({advance:(o:string|null)=>{void advance(o)},play:()=>play(),current,busy});latest.current={advance:(o:string|null)=>{void advance(o)},play:()=>play(),current,busy}
 useEffect(()=>{if(!hotkeys)return;const handler=(e:KeyboardEvent)=>{if(e.repeat||e.ctrlKey||e.metaKey||e.altKey||/INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement)?.tagName??''))return;const v=latest.current;if(v.busy)return;const keys=[hotkeys?.choiceA??'1',hotkeys?.choiceB??'2',hotkeys?.choiceC??'3',hotkeys?.choiceD??'4',hotkeys?.choiceE??'5',hotkeys?.choiceF??'6'];if(e.key.toLowerCase()===(hotkeys?.playPause??'p').toLowerCase()){e.preventDefault();v.play();return}const i=keys.findIndex(k=>k.toLowerCase()===e.key.toLowerCase());if(v.current?.type==='choice'&&i>=0&&v.current.options[i]){e.preventDefault();v.advance(v.current.options[i].id)}};window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler)},[hotkeys])
 useEffect(()=>{if(initial?.steps.length||!current||current.type!=='act'||!root.current)return;const token=++generation.current;lock.current=true;setBusy(true);void performAction(root.current,current,reduced,setResponses,()=>token===generation.current).finally(()=>{if(token===generation.current){lock.current=false;setBusy(false)}})
 // Only a fresh launch plays its opening action; resume restores the held caption.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[])

 useEffect(()=>{const m=matchMedia('(prefers-reduced-motion: reduce)');const f=()=>setSystem(m.matches);m.addEventListener('change',f);return()=>m.removeEventListener('change',f)},[])
 useEffect(()=>()=>{generation.current++;sound.current?.pause();root.current?.getAnimations?.({subtree:true}).forEach(a=>a.cancel())},[])
 useEffect(()=>{if(reduced)root.current?.getAnimations?.({subtree:true}).forEach(a=>a.finish())},[reduced])
 const animate=async(el:HTMLElement|null,frames:Keyframe[],duration=420)=>{if(reduced||!el?.animate)return;try{await el.animate(frames,{duration,easing:'ease-in-out'}).finished}catch{/* navigation cancellation */}}
 async function advance(option:string|null){
  if(!state||!compiled.story||state.ended||lock.current)return
  lock.current=true;setBusy(true);sound.current?.pause();setSpeaking(false);setError('');const token=++generation.current
  try{
   const next=advanceStory(compiled.story,state,option)
   for(const id of Object.keys(state.stage.actors)){if(!next.stage.actors[id])await animate(root.current?.querySelector(`[data-actor="${id}"]`)??null,[{opacity:1,transform:'translateX(0)'},{opacity:0,transform:'translateX(65px)'}]);if(token!==generation.current)return}
   const p={...progress,steps:[...progress.steps,option]};setState(next);setProgress(p);onProgress?.(p)
   await new Promise<void>(r=>requestAnimationFrame(()=>r()))
   for(const n of next.cues??[]){if(token!==generation.current)return;const el=root.current?.querySelector<HTMLElement>(n.actor?`[data-actor="${n.actor}"]`:'.story-world')??null
    if(n.type==='react'){setResponses({[n.actor]:n.action});await animate(el,[{opacity:1},{opacity:1}],pack.assets.characters[n.actor]?.rig?.preset==='cartoon-v1'?1900:650);if(token===generation.current)setResponses({})}
    else if(n.type==='show'&&!state.stage.actors[n.actor])await animate(el,[{opacity:0,transform:'translateX(-45px)'},{opacity:1,transform:'translateX(0)'}])
    else if(n.type==='effect'||(n.type==='move'&&n.action!=='exit')){const transforms:Record<string,string[]>={enter:['translateX(-70px)','translateX(0)'],nod:['translateY(0)','translateY(10px)','translateY(0)'],shake:['translateX(-8px)','translateX(8px)','translateX(0)'],bounce:['translateY(0)','translateY(-25px)','translateY(0)'],recoil:['rotate(0)','rotate(-5deg)','rotate(0)'],closeup:['scale(1)','scale(1.08)','scale(1)'],magic:['scale(.6) rotate(-4deg)','scale(1.08) rotate(2deg)','scale(1)']};await animate(el,(transforms[n.action]??['scale(.98)','scale(1)']).map((transform,i)=>({transform,opacity:(n.action==='fade'||n.action==='magic')&&i===0?0:1})),n.action==='magic'?850:420)}
   }
   if(token===generation.current&&compiled.story.nodes[next.cursor]?.type==='act'&&root.current)await performAction(root.current,compiled.story.nodes[next.cursor],reduced,setResponses,()=>token===generation.current)
  }finally{if(token===generation.current){lock.current=false;setBusy(false);root.current?.querySelector<HTMLButtonElement>('[data-next]')?.focus()}}
 }
 function play(text=current?.text,npc=true){const clip=pack.chinese?.lines[text]?.audio;if(!clip)return;sound.current?.pause();setSpeaking(false);const a=new Audio(clip);sound.current=a;const active=()=>sound.current===a;a.onplaying=()=>{if(active())setSpeaking(npc&&current?.type==='say'&&current.actor!=='I')};a.onpause=a.onended=()=>{if(active())setSpeaking(false)};a.onerror=()=>{if(active()){setSpeaking(false);setError('Audio unavailable. You can continue with the text.')}};void a.play().catch(()=>{if(active()){setSpeaking(false);setError('Audio could not play. Try Play again or continue with the text.')}})}

 if(compiled.errors.length||!state)return <div role="alert">{compiled.errors.map(e=><p key={e.line+e.message}>Line {e.line}: {e.message}</p>)}</div>
 return <div className="animated-story story-modern" ref={root}>
  <StoryStage pack={pack} state={state} current={current} speaking={speaking&&!busy&&!state.ended} reduced={reduced} responses={responses}/>
  <div className="story-meters">{Object.entries(compiled.story.variables).filter(([,v])=>(v as {visible:boolean}).visible).map(([id])=><span key={id}>{id}: {String(state.variables[id])}</span>)}</div>
  {!state.ended&&<div className="reading-controls" aria-label="Reading aids"><button aria-label="English" aria-pressed={showGloss} onClick={()=>setShowGloss(!showGloss)}>English <span aria-hidden="true">{showGloss?'●':'○'}</span></button><button aria-label="Pinyin" aria-pressed={showPinyin} onClick={()=>setShowPinyin(!showPinyin)}>Pinyin <span aria-hidden="true">{showPinyin?'●':'○'}</span></button></div>}
  <section className="story-dialogue" aria-live="polite">{state.ended?<><h2>{pack.quiz.length===4?(score!==null&&score>=75?'Complete':'Four questions before we return'):'Scene complete'}</h2>{pack.quiz.length===4&&<>{score!==null&&<p>{score}/100 · {score>=75?'Complete':'Review and retry'}</p>}{(score===null||score<75)&&<>{pack.quiz.map((q,i)=><fieldset key={i}><legend>{q.prompt}</legend>{q.options.map((o,j)=><label key={j}><input type="radio" name={'q'+i} checked={answers[i]===j} onChange={()=>setAnswers(answers.map((a,k)=>k===i?j:a))}/>{o}</label>)}{score!==null&&<p>{q.explanation}</p>}</fieldset>)}<button disabled={answers.includes(-1)} onClick={()=>{const p={...progress,quizzes:[...progress.quizzes,answers]};setProgress(p);onProgress?.(p);setAnswers([-1,-1,-1,-1])}}>Check answers</button></>}</>}{onNextEpisode&&(pack.quiz.length!==4||(score!==null&&score>=75))&&<button className="next-episode" data-next onClick={onNextEpisode}>Next Episode →</button>}{onComplete&&<button data-next onClick={onComplete}>Continue to the conversation</button>}</>:current.type==='choice'?<><h2>What do I do?</h2>{current.options.map((o:{id:string;text:string})=><div key={o.id}><button className="episode-choice" aria-label={o.text} data-next disabled={busy} onClick={()=>void advance(o.id)}><EpisodeInterlinear text={o.text} line={pack.chinese?.lines[o.text]} showPinyin={showPinyin} showGloss={showGloss}/></button>{pack.chinese?.lines[o.text]?.audio&&<button className="audio-play" aria-label={'Hear option: '+o.text} onClick={()=>play(o.text,false)}><PlayIcon/></button>}</div>)}</>:<><strong>{current.type==='act'||current.beat?'On the scene':current.actor==='I'?'My story':pack.assets.characters[current.actor]?.name}</strong>{line?.interlinear?.length?<div className="episode-line"><EpisodeInterlinear text={current.text} line={line} showPinyin={showPinyin} showGloss={showGloss}/></div>:<><p className={/[\u3400-\u9fff]/u.test(current.text)?'chinese-line':undefined} lang={/[\u3400-\u9fff]/u.test(current.text)?'zh-CN':undefined}>{current.text}</p>{showPinyin&&line?.pinyin&&<p className="pinyin">{line.pinyin}</p>}</>}{showGloss&&line?.english&&!!line.interlinear?.length&&<details className="sentence-translation"><summary>Sentence meaning</summary><p>{line.english}</p></details>}{showGloss&&line?.english&&!line.interlinear?.length&&<p className="sentence-meaning">{line.english}</p>}{line?.audio&&<button className="audio-play" aria-label="Play audio" title="Play audio" onClick={()=>play()}><PlayIcon/></button>}<button data-next disabled={busy} onClick={()=>void advance(null)}>{busy?'Action playing…':'Continue →'}</button></>}{error&&<p role="status">{error}</p>}</section>

  <footer><button aria-expanded={history} onClick={()=>setHistory(!history)}>Recall the conversation</button></footer>{history&&<aside>{state.history.map((h,i)=><p key={i}>{pack.assets.characters[h.actor]?.name??'I'}: {h.text}</p>)}</aside>}
 </div>
}

function PlayIcon(){return <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M8 4v16l13-8z"/></svg>}
