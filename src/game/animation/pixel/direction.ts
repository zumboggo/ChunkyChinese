import direction from './supportive-17.json' with {type:'json'}
export interface PixelShot {anchor:string;offset:number;reaction?:string;scene?:string;durationMs:number}
export function scriptFingerprint(script:string){let hash=2166136261;for(let i=0;i<script.length;i++)hash=Math.imul(hash^script.charCodeAt(i),16777619);return (hash>>>0).toString(16).padStart(8,'0')}
export function pixelShots(script:string,story:{labels:Record<string,number>;nodes:{type:string}[]}):Map<number,PixelShot>|null{
 if(scriptFingerprint(script)!==direction.scriptFingerprint)return null
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
