import {openDB} from 'idb'
import type {ChinesePackage} from './package'
import type {StoryProgress} from './StoryPlayback'
const database=()=>openDB('ChunkyChineseStory2',1,{upgrade(db){db.createObjectStore('records')}})
export async function read<T>(key:string):Promise<T|undefined>{return (await database()).get('records',key)}
export async function write(key:string,value:unknown){return (await database()).put('records',value,key)}
export const scope=(identity:string)=>`story2:${encodeURIComponent(identity)}:`
export interface EpisodeIntroMedia {src:string;poster:string;title:string;durationSeconds?:number}
export interface Release {previewOnly?:boolean;id:string;pack:ChinesePackage;created:string;resumeFrom?:string;category?:'daily-life'|'lms'|'name-of-the-wind'|'practice';episode?:number;intro?:EpisodeIntroMedia}
/** These commands settle without consuming a saved step. Keep every dialogue,
 * choice, label, variable and branching instruction identical for safe replay. */
export const playbackScript=(script:string)=>script.split('\n').filter(line=>!/^(scene|show|move|camera|rest|react|prop|effect) /.test(line.trim())).join('\n')
/** Visual-only revisions replay the same steps without rewriting old attempts. */
export async function progressForRelease(identity:string,release:Release):Promise<StoryProgress|undefined>{
 const current=await read<StoryProgress>(scope(identity)+'progress:'+release.id)
 if(current||!release.resumeFrom)return current
 const previous=await read<ChinesePackage>('bundled:'+release.resumeFrom)
 if(!previous||playbackScript(previous.script)!==playbackScript(release.pack.script))return undefined
 return read<StoryProgress>(scope(identity)+'progress:'+release.resumeFrom)
}
export async function publish(identity:string,pack:ChinesePackage){const encoded=new TextEncoder().encode(JSON.stringify(pack));const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoded))).map(n=>n.toString(16).padStart(2,'0')).join('');const existing=await read<Release>(scope(identity)+'release:'+digest);if(existing)return existing;const episode=pack.title.match(/^(?:Moonlight(?: Sculptor)?|The Name of the Wind)\s+(\d+)\b/i);const category=pack.title.startsWith('The Name of the Wind')?'name-of-the-wind' as const:'lms' as const;const release:Release={id:digest,pack:structuredClone(pack),created:new Date().toISOString(),...(episode?{category,episode:Number(episode[1])}:{})};await write(scope(identity)+'release:'+digest,release);return release}
export async function releases(identity:string):Promise<Release[]>{const db=await database(),keys=await db.getAllKeys('records');return Promise.all(keys.filter(k=>String(k).startsWith(scope(identity)+'release:')).map(k=>db.get('records',k)))}
export async function saveProgress(identity:string,id:string,value:StoryProgress,release?:Release){
 const db=await database(),tx=db.transaction('records','readwrite')
 await tx.store.put(value,scope(identity)+'progress:'+id)
 if(release)await tx.store.put(release,scope(identity)+'latest-played')
 await tx.done
}
export const latestPlayed=(identity:string)=>read<Release>(scope(identity)+'latest-played')
