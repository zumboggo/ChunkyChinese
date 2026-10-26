import type {ChineseLine} from './package'

export function waitForAudioMode(ms:number,signal:AbortSignal):Promise<void>{
 return new Promise((resolve,reject)=>{
  if(signal.aborted){reject(new DOMException('Stopped','AbortError'));return}
  const abort=()=>{clearTimeout(timer);reject(new DOMException('Stopped','AbortError'))}
  const timer=setTimeout(()=>{signal.removeEventListener('abort',abort);resolve()},ms)
  signal.addEventListener('abort',abort,{once:true})
 })
}

/** A cancelled scene must never speak or advance after navigation or a settings change. */
export async function speakAudioMode(text:string,lang:string,volume:number,signal:AbortSignal){
 if(signal.aborted)throw new DOMException('Stopped','AbortError')
 if(!('speechSynthesis' in window))throw Error('This device has no speech voice available. Try Chinese with recorded audio.')
 await new Promise<void>((resolve,reject)=>{
  const speech=window.speechSynthesis,utterance=new SpeechSynthesisUtterance(text)
  utterance.lang=lang;utterance.volume=volume
  const voice=speech.getVoices().find(v=>v.lang.toLowerCase().startsWith(lang.slice(0,2)))
  if(voice)utterance.voice=voice
  const cleanup=()=>{signal.removeEventListener('abort',abort);utterance.onend=null;utterance.onerror=null}
  const abort=()=>{cleanup();speech.cancel();reject(new DOMException('Stopped','AbortError'))}
  utterance.onend=()=>{cleanup();resolve()}
  utterance.onerror=()=>{cleanup();reject(Error('The device voice could not play. Check your speech voices and try again.'))}
  signal.addEventListener('abort',abort,{once:true});speech.speak(utterance)
 })
}

export async function playAudioModeLine({text,line,english,pause,volume,signal,onAudio}:{text:string;line?:ChineseLine;english:boolean;pause:number;volume:number;signal:AbortSignal;onAudio?:(audio:HTMLAudioElement|null)=>void}){
 if(signal.aborted)throw new DOMException('Stopped','AbortError')
 if(line?.audio){
  await new Promise<void>((resolve,reject)=>{
   const audio=new Audio(line.audio);audio.volume=volume;onAudio?.(audio)
   const cleanup=()=>{signal.removeEventListener('abort',abort);audio.onended=null;audio.onerror=null;onAudio?.(null)}
   const abort=()=>{cleanup();audio.pause();reject(new DOMException('Stopped','AbortError'))}
   audio.onended=()=>{cleanup();resolve()}
   audio.onerror=()=>{cleanup();reject(Error('Scene audio could not play. Try again.'))}
   signal.addEventListener('abort',abort,{once:true})
   void audio.play().catch(()=>{if(signal.aborted)return;cleanup();reject(Error('Audio could not start. Tap Resume Audio Mode to try again.'))})
  })
 }else if(/\p{Script=Han}/u.test(text))await speakAudioMode(text,'zh-CN',volume,signal)
 // Action-only beats have no dialogue; allow their motion to register before continuing.
 else await waitForAudioMode(1200,signal)
 if(english){
  const meaning=line?.english?.trim()||line?.interlinear?.map(c=>c.gloss).join(' ').trim()
  if(meaning){await waitForAudioMode(pause*1000,signal);await speakAudioMode(meaning,'en-US',volume,signal)}
  else if(/\p{Script=Han}/u.test(text))throw Error('This line has no English translation. Choose Chinese to continue.')
 }
}
