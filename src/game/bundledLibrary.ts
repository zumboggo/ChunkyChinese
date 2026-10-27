import catalogJson from '../../public/stories/animated/catalog.json'
import {read,write,type Release} from './animation/storage'
import {validateChinese,type ChinesePackage} from './animation/package'
export type CatalogEntry = Omit<Release,'pack'|'created'> & {path:string;summary?:{title:string;description:string;cover?:string}}
// Ship the catalog with its compatible player. An old open app must not fetch a
// newer catalog whose character schema it cannot render.
export const bundledCatalog = catalogJson as CatalogEntry[]
/** Catalog-only cards keep hundreds of voice packages out of startup memory. */
export function bundledPreviews(catalog:CatalogEntry[]=bundledCatalog):Release[]{return catalog.filter(e=>e.summary).map(e=>({...e,created:'',previewOnly:true,pack:{format:2,profile:'chinese',title:e.summary!.title,description:e.summary!.description,script:'',quiz:[],assets:{characters:{},backgrounds:e.summary!.cover?{cover:{src:import.meta.env.BASE_URL+e.summary!.cover}}:{}}}}))}
// Large narrated packages need time on slower mobile connections.
const EPISODE_DOWNLOAD_TIMEOUT_MS=120_000
const RETRY_DOWNLOAD='Check your connection, then choose Play / resume episode to retry. Your saved progress is safe.'
export async function loadBundledEntry(entry:CatalogEntry):Promise<Release>{
 if(!/^[a-z0-9-]+$/.test(entry.id)||!/^[a-z0-9-]+\.json$/.test(entry.path))throw Error('Invalid catalog entry')
 const key='bundled:'+entry.id
 let pack=await read<ChinesePackage>(key).catch(()=>undefined)
 if(pack&&validateChinese(pack).errors.length)pack=undefined
 if(!pack){
  const controller=new AbortController()
  const timeout=setTimeout(()=>controller.abort(),EPISODE_DOWNLOAD_TIMEOUT_MS)
  try {
   const response=await fetch(import.meta.env.BASE_URL+'stories/animated/'+entry.path,{signal:controller.signal})
   if(!response.ok)throw Error('Episode download failed. Choose Play to retry; your saved progress is safe.')
   pack=await response.json() as ChinesePackage
  } catch {
   throw Error((controller.signal.aborted?'The episode download took too long. ':'The episode could not finish downloading. ')+RETRY_DOWNLOAD)
  } finally {clearTimeout(timeout)}
  if(validateChinese(pack).errors.length)throw Error('Episode needs an updated player')
  await write(key,pack).catch(()=>undefined)
 }
 return {id:entry.id,pack,created:'',resumeFrom:entry.resumeFrom,category:entry.category,episode:entry.episode,intro:entry.intro}
}
export async function loadBundledLibrary(onLoaded:(release:Release)=>void,catalog:CatalogEntry[]=bundledCatalog){
 const results=await Promise.allSettled(catalog.map(async entry=>onLoaded(await loadBundledEntry(entry))))
 return catalog.filter((_,i)=>results[i].status==='rejected')
}
