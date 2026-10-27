import {advanceStory,compileStory,replayStory} from './shared/engine/story-engine.js'
import type {ChinesePackage} from './package'
import type {StoryProgress} from './StoryPlayback'
import type {AudioModeOptions} from './AudioModeDialog'

export interface PocketBeat {steps:(string|null)[];text:string;audio?:string;english?:string;silence?:number}
export interface PocketPlan {beats:PocketBeat[];end:StoryProgress;ended:boolean}
export interface PocketMarker {at:number;steps:(string|null)[];text:string}
export interface PocketTrack {blob:Blob;duration:number;markers:PocketMarker[];end:StoryProgress;ended:boolean}
export const meaningOf=(line:NonNullable<ChinesePackage['chinese']>['lines'][string])=>(line.english||line.interlinear?.map(c=>c.gloss).join(' ')||'').trim()

/** Pick a finite route before playback. No JavaScript or story animations are
 * needed between scenes once the phone has locked. Manual routes stop at a choice. */
export function planPocketAudio(pack:ChinesePackage,start:StoryProgress,options:AudioModeOptions,random:()=>number=Math.random):PocketPlan{
 if(options.chinese===false&&!options.english)throw Error('Turn on English or Chinese audio to prepare listening.')
 const compiled=compileStory(pack.script,pack.assets)
 if(compiled.errors.length||!compiled.story)throw Error('This episode could not be prepared.')
 let state=replayStory(compiled.story,start.steps,start.seed)
 const steps=[...start.steps],beats:PocketBeat[]=[]
 for(let count=0;!state.ended;count++){
  if(count>=600)throw Error('This route is too long for one pocket recording. Choose a shorter route first.')
  const node=compiled.story.nodes[state.cursor]
  if(node.type==='choice'&&!options.automaticChoices)break
  const option=node.type==='choice'?node.options[Math.min(node.options.length-1,Math.floor(random()*node.options.length))]:null
  const text=option?.text??node.text??'',line=pack.chinese?.lines[text]
  if(options.chinese!==false&&/\p{Script=Han}/u.test(text)&&!line?.audio)throw Error('This episode needs a Chinese recording before pocket listening can be prepared.')
  const english=line?meaningOf(line):(!/\p{Script=Han}/u.test(text)?text:'')
  if(options.english&&text&&!english)throw Error('This episode needs an English translation before pocket listening can be prepared.')
  beats.push({steps:[...steps],text,audio:options.chinese!==false?line?.audio:undefined,english,silence:option?options.choiceDelay:undefined})
  steps.push(option?.id??null)
  state=advanceStory(compiled.story,state,option?.id??null)
 }
 return {beats,end:{...start,steps},ended:state.ended}
}
export async function textDigest(text:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))).map(n=>n.toString(16).padStart(2,'0')).join('')}
export function pocketPosition(track:Pick<PocketTrack,'markers'|'end'|'duration'>,seconds:number){
 if(seconds>=track.duration)return {steps:track.end.steps,text:''}
 let low=0,high=track.markers.length-1
 while(low<high){const mid=Math.ceil((low+high)/2);if(track.markers[mid].at<=seconds)low=mid;else high=mid-1}
 return track.markers[low]??{steps:track.end.steps,text:''}
}
function pcm16(samples:Float32Array){const bytes=new Uint8Array(samples.length*2),view=new DataView(bytes.buffer);for(let i=0;i<samples.length;i++){const s=Math.max(-1,Math.min(1,samples[i]));view.setInt16(i*2,s<0?s*32768:s*32767,true)}return bytes}
export function wavHeader(samples:number,rate=16000){
 const bytes=new Uint8Array(44),v=new DataView(bytes.buffer)
 const word=(at:number,text:string)=>{for(let i=0;i<text.length;i++)bytes[at+i]=text.charCodeAt(i)}
 word(0,'RIFF');v.setUint32(4,36+samples*2,true);word(8,'WAVE');word(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,rate,true);v.setUint32(28,rate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);word(36,'data');v.setUint32(40,samples*2,true)
 return bytes
}
export async function preparePocketAudio(pack:ChinesePackage,start:StoryProgress,options:AudioModeOptions,signal:AbortSignal,onProgress:(text:string)=>void):Promise<PocketTrack>{
 const plan=planPocketAudio(pack,start,options)
 if(!plan.beats.length)throw Error(plan.ended?'This episode is complete. Restart it to listen again.':'Choose a story response first, or select automatic choices for hands-free listening.')
 const decoder=new OfflineAudioContext(1,1,16000),parts:BlobPart[]=[],markers:PocketMarker[]=[]
 let samples=0
 const check=()=>{if(signal.aborted)throw new DOMException('Stopped','AbortError')}
 function append(bytes:Uint8Array){samples+=bytes.length/2;if(samples>16000*60*30)throw Error('This recording exceeds 30 minutes. Continue from a later scene.');parts.push(bytes as BlobPart)}
 const silence=(seconds:number)=>{if(seconds>0)append(new Uint8Array(Math.round(seconds*16000)*2))}
 const cache=new Map<string,Uint8Array>()
 async function clip(src:string){
  check();let bytes=cache.get(src)
  if(!bytes){
   const response=await fetch(src,{signal});if(!response.ok)throw Error('A recording is unavailable. Connect to the internet and prepare again.')
   const audio=await decoder.decodeAudioData(await response.arrayBuffer());check()
   const mono=new Float32Array(audio.length)
   for(let c=0;c<audio.numberOfChannels;c++){const channel=audio.getChannelData(c);for(let i=0;i<mono.length;i++)mono[i]+=channel[i]/audio.numberOfChannels}
   bytes=pcm16(mono);cache.set(src,bytes)
  }
  append(bytes)
 }
 for(let i=0;i<plan.beats.length;i++){
  check();const beat=plan.beats[i];onProgress(`Preparing audio ${i+1} of ${plan.beats.length}…`)
  markers.push({at:samples/16000,steps:beat.steps,text:beat.text})
  if(beat.audio)await clip(beat.audio)
  if(options.english&&beat.english){
   if(beat.audio)silence(options.englishPause)
   const key=await textDigest(beat.english);await clip(`${import.meta.env.BASE_URL}stories/audio/${key}.m4a`)
  }else if(!beat.audio)silence(1.2)
  silence(beat.silence??0)
 }
 check()
 return {blob:new Blob([wavHeader(samples),...parts],{type:'audio/wav'}),duration:samples/16000,markers,end:plan.end,ended:plan.ended}
}
