import crypto from 'node:crypto';
export function migrationMap(pack,previous){
 // Never install another episode's legacy save mapping into this build.
 if(previous.id!==pack.id)return {id:pack.id,version:'',target:pack.version,indices:[]};
 const key=n=>n.type==='line'?n.type+':'+n.speaker+':'+n.phrases.map(p=>p.zh).join(''):n.type==='choice'?'choice:'+n.id:n.type==='reaction'?'reaction:'+n.actor+':'+n.emotion+':'+n.scene:n.type;
 const keys=pack.nodes.map(n=>crypto.createHash('sha256').update(key(n)).digest('hex'));let cursor=0;
 const indices=previous.anchors.map(key=>{const i=keys.indexOf(key,cursor);if(i>=0)cursor=i+1;return i;});
 return {id:previous.id,version:previous.version,target:pack.version,indices};
}
