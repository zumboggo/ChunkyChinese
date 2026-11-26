import type {ChineseLine,ChinesePackage} from './package'
import {scriptFingerprint} from './pixel/direction'
/** Runtime-only presentation: immutable packages and story cursors stay intact. */
export const usesIntertitles=(script:string,presentation?:ChinesePackage['presentation'])=>presentation?.layout==='intertitles'||scriptFingerprint(script)==='2e115d44'
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
