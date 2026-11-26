import type {ChineseLine,ChinesePackage} from './package'
import {scriptFingerprint} from './pixel/direction'
/** Runtime-only presentation: immutable packages and story cursors stay intact. */
const releasedIntertitles=new Set([
 '2e115d44', // Super Supportive 18
 '840b2116', // Super Supportive 19: preserve the pixel performances.
 '8e5f3e54', // Super Supportive 20
 '343b1c67', // Super Supportive 21
 '89103a15', // Super Supportive 22
 'a6ee588f', // Super Supportive 23
 '37f1c7d2', // Super Supportive 24
 '731c6982', // Super Supportive 25
 '921fd06e', // Super Supportive 26
 'f1bdf6b0', // Super Supportive 27
])
export const usesIntertitles=(script:string,presentation?:ChinesePackage['presentation'])=>presentation?.layout==='intertitles'||releasedIntertitles.has(scriptFingerprint(script))
export function intertitlePages(line?:ChineseLine):ChineseLine[]{
 const chunks=line?.interlinear
 if(!chunks?.length)return [line??{}]
 const pages:ChineseLine[]=[]
 for(let i=0;i<chunks.length;){
  const size=chunks.length-i===3?3:2
  pages.push({...line,interlinear:chunks.slice(i,i+size)});i+=size
 }
 return pages
}
