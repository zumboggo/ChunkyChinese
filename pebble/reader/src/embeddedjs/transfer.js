import {nodeAt,nodeCount} from './reader.js';
// Adler-32 over ASCII wire data; bounded integer arithmetic works on Alloy's float build.
export function checksum(text){let a=1,b=0;for(let i=0;i<text.length;i++){a=(a+text.charCodeAt(i))%65521;b=(b+a)%65521;}return (b*65536+a).toString(16);}
export function validate(pack,glyphs,availableArt){
 if(pack?.format!==1||!/^supportive-\d+(?:-v\d+)?$/.test(pack.id)||!/^\w{12}$/.test(pack.version)||(!Array.isArray(pack.nodes)&&typeof pack.nodeAt!=='function')||nodeCount(pack)<1||nodeCount(pack)>2000)throw Error('Invalid episode');
 if(!Number.isInteger(pack.entry)||pack.entry<0||pack.entry>=nodeCount(pack))throw Error('Invalid entry');
 let ending=false;
 const target=t=>{if(!Number.isInteger(t)||t<0||t>=nodeCount(pack))throw Error('Invalid branch');};
 const text=p=>{for(const k of ['zh','py','en']){if(typeof p[k]!=='string'||!p[k]||p[k].length>2000)throw Error('Invalid phrase');for(const c of p[k])if(!glyphs.includes(c))throw Error('Font update needed');}};
 for(let i=0;i<nodeCount(pack);i++){const n=nodeAt(pack,i);if(!['line','choice','goto','reaction','end'].includes(n.type))throw Error('Unknown node');if(n.type==='end')ending=true;if(n.type==='goto')target(n.to);
 if(n.type==='line'){if(!n.phrases?.length)throw Error('Empty line');n.phrases.forEach(text);}
 if(n.type==='choice'){if(!n.options||n.options.length<2||n.options.length>4)throw Error('Invalid choice');for(const o of n.options){target(o.to);if(!o.phrases?.length)throw Error('Empty choice');o.phrases.forEach(text);}}
 if(n.type==='reaction'&&!availableArt(n.actor+'-'+n.emotion))throw Error('Missing portrait');}
 if(!ending||!availableArt('opening')||!availableArt('closing'))throw Error('Incomplete episode');
 // Reject cycles and paths that fall off the package before enabling offline playback.
 const color=new Uint8Array(nodeCount(pack)),stack=[[pack.entry,0]];
 while(stack.length){const frame=stack[stack.length-1],i=frame[0];target(i);if(!frame[1]){if(color[i]===1)throw Error('Story cycle');if(color[i]===2){stack.pop();continue;}color[i]=1;}
 const n=nodeAt(pack,i);const targets=n.type==='end'?[]:n.type==='goto'?[n.to]:n.type==='choice'?n.options.map(o=>o.to):[i+1];
 if(frame[1]<targets.length){const next=targets[frame[1]++];target(next);if(color[next]===1)throw Error('Story cycle');if(color[next]!==2)stack.push([next,0]);}else{color[i]=2;stack.pop();}}
 return pack;
}
export class Transfer {
 constructor(io,verify){this.io=io;this.verify=verify;this.pending=null;this.completed=null;}
 begin(total,hash,version){if(!Number.isInteger(total)||total<1||total>500000||!/^[0-9a-f]{1,8}$/.test(hash)||!/^\w{12}$/.test(version))throw Error('Invalid transfer');this.completed=null;this.pending={total,hash,version,offset:0};this.io.begin(total);return 0;}
 chunk(offset,data){const p=this.pending;if(!p||typeof data!=='string'||data.length>1024||/[^\x20-\x7e\n]/.test(data))throw Error('Invalid chunk');if(offset<p.offset)return p.offset;if(offset!==p.offset||offset+data.length>p.total)throw Error('Wrong offset');this.io.write(data,offset);p.offset+=data.length;return p.offset;}
 finish(){if(!this.pending&&this.completed)return this.completed;const p=this.pending;if(!p||p.offset!==p.total)throw Error('Incomplete download');if(this.io.complete){const pack=this.io.complete(p);this.verify(pack);this.io.activate(pack);this.pending=null;this.completed=pack;return pack;}const wire=this.io.read();if(checksum(wire)!==p.hash)throw Error('Checksum mismatch');const pack=JSON.parse(wire);if(pack.version!==p.version)throw Error('Version mismatch');this.verify(pack);this.io.activate(pack);this.pending=null;this.completed=pack;return pack;}
}
