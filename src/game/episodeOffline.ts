import {bundledCatalog,loadBundledEntry,type CatalogEntry} from './bundledLibrary'
import {prepareOfflineAppShell} from '../flightOffline'

export const EPISODE_OFFLINE_CACHE='chunky-episode-downloads-v1'
export interface DownloadProgress {done:number;total:number;title:string;failed:string[]}
// Embedded data URLs already live in the episode package. Only local media
// belongs in this cache; source citations are not playback dependencies.
export function episodeMedia(value:unknown):string[]{
 const urls=new Set<string>()
 function visit(item:unknown){
  if(typeof item==='string'){
   if(/^stories\/animated\/[^\s]+\.(?:mp4|mp3|m4a|ogg|wav|webm|png|jpe?g|webp|svg|avif)$/i.test(item))urls.add(import.meta.env.BASE_URL+item)
  }else if(Array.isArray(item))item.forEach(visit)
  else if(item&&typeof item==='object')Object.values(item).forEach(visit)
 }
 visit(value);return [...urls]
}
export async function downloadEpisodes(onProgress:(p:DownloadProgress)=>void,signal:AbortSignal,catalog:CatalogEntry[]=bundledCatalog){
 if(!('caches' in globalThis))throw Error('Offline downloads need a secure browser with storage enabled.')
 // Includes the loaded Game player chunk as well as the startup shell.
 onProgress({done:0,total:catalog.length,title:'Preparing the offline app…',failed:[]})
 const shell=await new Promise<Awaited<ReturnType<typeof prepareOfflineAppShell>>>((resolve,reject)=>{
  const abort=()=>reject(new Error('Download stopped'))
  const timer=setTimeout(()=>reject(new Error('Offline app setup timed out. Reload and retry.')),120_000)
  signal.addEventListener('abort',abort,{once:true})
  if(signal.aborted)abort()
  void prepareOfflineAppShell().then(resolve,reject).finally(()=>{clearTimeout(timer);signal.removeEventListener('abort',abort)})
 })
 if(shell.failed)throw Error('Some app files could not be saved. Stay online and retry.')
 await navigator.storage?.persist?.().catch(()=>false)
 const cache=await caches.open(EPISODE_OFFLINE_CACHE)
 const failed:string[]=[]
 let done=0
 const media=async(url:string)=>{
  signal.throwIfAborted()
  if(await cache.match(url))return
  const response=await fetch(url,{signal:AbortSignal.any([signal,AbortSignal.timeout(120_000)])})
  if(!response.ok||response.status===206)throw Error('Media download failed')
  await cache.put(url,response)
 }
 // One narrated package at a time keeps memory bounded on handhelds.
 for(const entry of catalog){
  signal.throwIfAborted()
  onProgress({done,total:catalog.length,title:entry.summary?.title??entry.id,failed:[...failed]})
  try{
   const release=await loadBundledEntry(entry,{requireStorage:true,signal})
   for(const url of episodeMedia([entry,release.pack]))await media(url)
   done++
  }catch(error){if(signal.aborted)throw error;failed.push(entry.summary?.title??entry.id)}
 }
 // Covers used by the book selector are independent of episode artwork.
 for(const path of ['gate-in-the-mist.json','jedi/series-cover.jpg','super-supportive/series-cover.png']){
  try{await media(import.meta.env.BASE_URL+'stories/animated/'+path)}catch(error){if(signal.aborted)throw error;failed.push('Library asset: '+path)}
 }
 const result={done,total:catalog.length,title:'',failed}
 onProgress(result);return result
}
