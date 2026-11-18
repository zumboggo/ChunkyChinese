import {useEffect,useRef,useState} from 'react'
import {visualNovel} from '../../../../pebble/web/visual-novel-renderer.js'
import data from '../../../../pebble/web/assets.json'
import type {PixelShot} from './direction'
import './pixel-scene.css'
let renderer:ReturnType<typeof visualNovel>|undefined
const resources=()=>renderer??=visualNovel(data.config,data.resource,data.actors,data.anims,data.sceneIds)
export default function PixelScene({shot,reduced,onReady,onNext,onBack}:{shot:PixelShot;reduced:boolean;onReady:()=>void;onNext:()=>void;onBack:()=>void}){
 const canvas=useRef<HTMLCanvasElement>(null),ready=useRef(onReady);ready.current=onReady
 const [held,setHeld]=useState(false)
 useEffect(()=>{
  const element=canvas.current!,container=element.parentElement!
  const resize=()=>{const ratio=window.devicePixelRatio||1;const available=Math.min(container.clientWidth,600,Math.max(200,(window.innerHeight-260)*200/228));const scale=Math.max(1,Math.floor(available*ratio/200));element.style.width=`${200*scale/ratio}px`;element.style.height=`${228*scale/ratio}px`}
  const observer=new ResizeObserver(resize);observer.observe(container);resize();return()=>observer.disconnect()
 },[])

 useEffect(()=>{
  setHeld(false);const ctx=canvas.current!.getContext('2d')!;const vn=resources()
  const scene=shot.scene?data.library.scenes.find(s=>s.id===shot.scene):undefined
  const id=shot.reaction?(data.art as Record<string,number>)[shot.reaction+'-full']:undefined
  const bytes=Uint8Array.from(atob(data.resource),c=>c.charCodeAt(0))
  let nativeDuration=scene?.duration??0
  if(id!==undefined){const anim=data.anims[id-1000];for(let i=0;i<anim[2];i++){const p=anim[0]+i*6;nativeDuration+=bytes[p]|bytes[p+1]<<8}}
  if(!scene&&id===undefined)throw Error('Pixel performance is unavailable')
  let frame=0,timer=0,last=performance.now(),elapsed=0,finished=false
  const draw=(fraction:number)=>{ctx.imageSmoothingEnabled=false;if(scene)vn.render(ctx,scene,'playing',fraction*nativeDuration,fraction*shot.durationMs);else vn.reaction(ctx,id!,fraction*nativeDuration,3)}
  const tick=(now:number)=>{const dt=Math.min(100,now-last);last=now;if(!document.hidden)elapsed+=dt;const fraction=reduced?1:Math.min(1,elapsed/shot.durationMs);draw(fraction)
   if(fraction===1){finished=true;timer=window.setTimeout(()=>{setHeld(true);ready.current()},300)}else frame=requestAnimationFrame(tick)
  }
  const visibility=()=>{last=performance.now();if(!document.hidden&&!finished){cancelAnimationFrame(frame);frame=requestAnimationFrame(tick)}}
  document.addEventListener('visibilitychange',visibility);frame=requestAnimationFrame(tick)
  return()=>{cancelAnimationFrame(frame);clearTimeout(timer);document.removeEventListener('visibilitychange',visibility)}
 },[shot,reduced])
 return <section className="pixel-scene" aria-label="Pixel story animation" data-pixel-phase={held?'held':'playing'}>
  <canvas ref={canvas} width={200} height={228} role="img" aria-label={shot.reaction?.replaceAll('-',' ')||'Story scene'}/>
  <p role="status">{held?'Tap Next when you’re ready.':'A moment in the story…'}</p>
  <div className="reading-navigation"><button className="reading-previous" onClick={onBack} aria-label="Return to passage">‹</button><button data-next disabled={!held} onClick={onNext}>Next →</button></div>
 </section>
}
