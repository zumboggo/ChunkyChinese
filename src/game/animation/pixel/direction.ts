import episode17 from './supportive-17.json' with {type:'json'}
import episode18 from './supportive-18.json' with {type:'json'}
import episode19 from './supportive-19.json' with {type:'json'}
import episode20 from './supportive-20.json' with {type:'json'}
import episode21 from './supportive-21.json' with {type:'json'}
import episode22 from './supportive-22.json' with {type:'json'}
import episode23 from './supportive-23.json' with {type:'json'}
import episode25 from './supportive-25.json' with {type:'json'}
import episode24 from './supportive-24.json' with {type:'json'}
const directions=[episode17,episode18,episode19,episode20,episode21,episode22,episode23,episode24,episode25]
export interface PixelShot {anchor:string;offset:number;reaction?:string;scene?:string;durationMs:number;comic?:{sheet:string;panel:number;alt:string;aspectRatio?:number;columns?:number}}
export function scriptFingerprint(script:string){let hash=2166136261;for(let i=0;i<script.length;i++)hash=Math.imul(hash^script.charCodeAt(i),16777619);return (hash>>>0).toString(16).padStart(8,'0')}
export function pixelShots(script:string,story:{labels:Record<string,number>;nodes:{type:string}[]}):Map<number,PixelShot>|null{
 const direction=directions.find(d=>d.scriptFingerprint===scriptFingerprint(script))
 if(!direction)return null
 const shots=new Map<number,PixelShot>()
 for(const shot of direction.shots){
  const anchor=story.labels[shot.anchor];if(anchor===undefined)throw Error('Missing pixel direction anchor: '+shot.anchor)
  let offset=0,found=false
  for(let i=anchor+1;i<story.nodes.length&&story.nodes[i].type!=='label';i++)if(['say','act'].includes(story.nodes[i].type)){
   if(offset++===shot.offset){if(shots.has(i))throw Error('Duplicate pixel direction');shots.set(i,shot);found=true;break}
  }
  if(!found)throw Error('Pixel direction no longer matches the passage: '+shot.anchor)
 }
 for(let i=0;i<story.nodes.length;i++)if(['say','act'].includes(story.nodes[i].type)&&!shots.has(i))throw Error('Missing pixel shot at '+i)
 return shots
}
