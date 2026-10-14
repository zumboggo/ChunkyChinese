import catalogJson from '../../public/stories/animated/catalog.json'
import {read,write,type Release} from './animation/storage'
import {validateChinese,type ChinesePackage} from './animation/package'
export type CatalogEntry = Omit<Release,'pack'|'created'> & {path:string}
// Ship the catalog with its compatible player. An old open app must not fetch a
// newer catalog whose character schema it cannot render.
export const bundledCatalog = catalogJson as CatalogEntry[]
export async function loadBundledLibrary(onLoaded:(release:Release)=>void, catalog:CatalogEntry[]=bundledCatalog){
 const results=await Promise.allSettled(catalog.map(async entry=>{
  if(!/^[a-z0-9-]+$/.test(entry.id)||!/^[a-z0-9-]+\.json$/.test(entry.path))throw Error('Invalid catalog entry')
  const key='bundled:'+entry.id
  let pack=await read<ChinesePackage>(key).catch(()=>undefined)
  if(pack&&validateChinese(pack).errors.length)pack=undefined
  if(!pack){
   const response=await fetch(import.meta.env.BASE_URL+'stories/animated/'+entry.path,{signal:AbortSignal.timeout(20000)})
   if(!response.ok)throw Error('Episode download failed')
   pack=await response.json() as ChinesePackage
   if(validateChinese(pack).errors.length)throw Error('Episode needs an updated player')
   // A storage quota failure must not prevent online playback.
   await write(key,pack).catch(()=>undefined)
  }
  onLoaded({id:entry.id,pack,created:'',resumeFrom:entry.resumeFrom,category:entry.category,episode:entry.episode})
 }))
 return catalog.filter((_,i)=>results[i].status==='rejected')
}
