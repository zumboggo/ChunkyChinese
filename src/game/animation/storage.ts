import {openDB} from 'idb'
import type {ChinesePackage} from './package'
import type {StoryProgress} from './StoryPlayback'
const database=()=>openDB('ChunkyChineseStory2',1,{upgrade(db){db.createObjectStore('records')}})
export async function read<T>(key:string):Promise<T|undefined>{return (await database()).get('records',key)}
export async function write(key:string,value:unknown){return (await database()).put('records',value,key)}
export const scope=(identity:string)=>`story2:${encodeURIComponent(identity)}:`
export interface Release {id:string;pack:ChinesePackage;created:string}
export async function publish(identity:string,pack:ChinesePackage){const encoded=new TextEncoder().encode(JSON.stringify(pack));const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoded))).map(n=>n.toString(16).padStart(2,'0')).join('');const existing=await read<Release>(scope(identity)+'release:'+digest);if(existing)return existing;const release={id:digest,pack:structuredClone(pack),created:new Date().toISOString()};await write(scope(identity)+'release:'+digest,release);return release}
export async function releases(identity:string):Promise<Release[]>{const db=await database(),keys=await db.getAllKeys('records');return Promise.all(keys.filter(k=>String(k).startsWith(scope(identity)+'release:')).map(k=>db.get('records',k)))}
export async function saveProgress(identity:string,id:string,value:StoryProgress){await write(scope(identity)+'progress:'+id,value)}
