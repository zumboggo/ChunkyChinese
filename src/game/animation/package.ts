import {validateContinuity,type ContinuityDefinition} from './continuity.ts'
import JSZip from 'jszip'
import {validateOutcomeScorecard,type OutcomeScorecard} from './outcomeScorecard.ts'
import type {ReaderInterlinearChunk} from '../../types'
import {compileStory,validatePackage,type StoryPackage} from './shared/engine/story-engine.js'
import {packageAssetEntries,packageContentBytes} from './shared/engine/acting-library.js'
export interface ChineseLine {pinyin?:string;english?:string;audio?:string;interlinear?:ReaderInterlinearChunk[]}
export interface ChinesePackage extends StoryPackage {continuity?:ContinuityDefinition;outcomeScorecard?:OutcomeScorecard;notice?:string;chinese?:{lines:Record<string,ChineseLine>}}
export function entries(pack:ChinesePackage):{src:string}[]{return packageAssetEntries(pack)}
export function size(pack:ChinesePackage){const copy=structuredClone(pack);let bytes=0;for(const l of Object.values(copy.chinese?.lines??{})){if(l.audio){const data=l.audio.split(',')[1]??'';bytes+=Math.floor(data.length*3/4)-(data.endsWith('==')?2:data.endsWith('=')?1:0);l.audio=''}}return packageContentBytes(copy)+bytes}
const image=/^data:image\/(webp|png|jpeg);base64,[A-Za-z0-9+/=]+$/
const audio=/^data:audio\/(mpeg|ogg|mp4|wav);base64,[A-Za-z0-9+/=]+$/
export function validateChinese(pack:ChinesePackage){
 try{
  if(!pack||pack.format!==2||!pack.title?.trim()||!pack.assets?.characters||!pack.assets?.backgrounds)throw Error('Use a titled Story 2 package with cast and backgrounds.')
  const result=validatePackage(pack)
  // Classroom quizzes are optional for personal Mandarin adventures.
  const errors=result.errors.filter(e=>!(Array.isArray(pack.quiz)&&pack.quiz.length===0&&e.message.startsWith('Add four questions')))
  for(const message of validateContinuity(pack.continuity))errors.push({line:1,message})
  if(result.story)for(const message of validateOutcomeScorecard(pack.outcomeScorecard,result.story))errors.push({line:1,message})
  if(entries(pack).some(a=>!image.test(a.src)&&!audio.test(a.src)))errors.push({line:1,message:'Embed images/audio in the package; remote or executable assets are not allowed.'})
  for(const l of Object.values(pack.chinese?.lines??{})){if(!l||typeof l!=='object'||l.pinyin!==undefined&&typeof l.pinyin!=='string'||l.english!==undefined&&typeof l.english!=='string'||l.audio!==undefined&&!audio.test(l.audio))errors.push({line:1,message:'Invalid Chinese text or embedded audio.'})}
  for(const [text,l] of Object.entries(pack.chinese?.lines??{}))if(l.interlinear!==undefined){
   const chunks=l.interlinear
   if(!Array.isArray(chunks)||!chunks.length||chunks.some(c=>!c||typeof c.chinese!=='string'||!c.chinese.trim()||typeof c.gloss!=='string'||!c.gloss.trim()||c.pinyin!==undefined&&typeof c.pinyin!=='string'||/[\u3400-\u9fff]/u.test(c.chinese)&&!c.pinyin?.trim()))errors.push({line:1,message:'Interlinear chunks need Chinese text, contextual glosses and pinyin.'})
   else if(chunks.map(c=>c.chinese).join('')!==text)errors.push({line:1,message:'Interlinear chunks must reconstruct their exact dialogue or choice text.'})
  }
  if(size(pack)>5_000_000)errors.push({line:1,message:'Episode exceeds the shared 5 MB limit.'})
  return {...result,errors}
 }catch(e){return {errors:[{line:1,message:String(e)}],story:undefined}}
}
export function chineseTexts(pack:ChinesePackage):string[]{const c=compileStory(pack.script,pack.assets);return [...new Set<string>((c.story?.nodes??[]).flatMap((n:{type:string;text?:string;options?:{text:string}[]})=>n.type==='say'&&n.text?[n.text]:n.type==='choice'?(n.options??[]).map(o=>o.text):[]).filter((s:string)=>/[\u3400-\u9fff]/u.test(s)))]}
export async function exportPackage(pack:ChinesePackage){
 const errors=validateChinese(pack).errors;if(errors.length)throw Error(errors.map(e=>e.message).join('\n'))
 const zip=new JSZip(),copy=structuredClone(pack);let i=0
 const add=(src:string)=>{const m=src.match(/^data:([^;]+);base64,(.+)$/)!;const ext=m[1].split('/')[1];const path=`assets/${i++}.${ext}`;zip.file(path,m[2],{base64:true});return path}
 for(const a of entries(copy))a.src=add(a.src)
 for(const l of Object.values(copy.chinese?.lines??{}))if(l.audio)l.audio=add(l.audio)
 zip.file('episode.story',copy.script);zip.file('episode.json',JSON.stringify({...copy,script:undefined},null,2));return zip.generateAsync({type:'blob'})
}
export async function importPackage(file:File):Promise<ChinesePackage>{
 if(file.size>7_500_000)throw Error('Choose a package below 7.5 MB.')
 if(file.name.endsWith('.json')){const p=JSON.parse(await file.text());const v=validateChinese(p);if(v.errors.length)throw Error(v.errors.map(e=>e.message).join('\n'));return p}
 const zip=await JSZip.loadAsync(await file.arrayBuffer());if(Object.keys(zip.files).length>180)throw Error('Too many package files.')
 const meta=await zip.file('episode.json')?.async('string'),script=await zip.file('episode.story')?.async('string');if(!meta||!script)throw Error('Package needs episode.json and episode.story.')
 const p={...JSON.parse(meta),script} as ChinesePackage;let bytes=meta.length+script.length
 const read=async(path:string)=>{if(!/^assets\/[\w-]+\.(webp|png|jpeg|mpeg|mp3|ogg|mp4|wav)$/.test(path))throw Error('Invalid asset path.');const f=zip.file(path);if(!f)throw Error('Missing asset.');const b=await f.async('uint8array');bytes+=b.length;if(bytes>5_000_000)throw Error('Episode exceeds 5 MB.');const ext=path.split('.').at(-1)!;return `data:${['webp','png','jpeg'].includes(ext)?'image/':'audio/'}${ext==='mp3'?'mpeg':ext};base64,${await f.async('base64')}`}
 for(const a of entries(p))a.src=await read(a.src)
 for(const l of Object.values(p.chinese?.lines??{}))if(l.audio)l.audio=await read(l.audio)
 const v=validateChinese(p);if(v.errors.length)throw Error(v.errors.map(e=>e.message).join('\n'));return p
}
export function download(blob:Blob,name:string){const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
