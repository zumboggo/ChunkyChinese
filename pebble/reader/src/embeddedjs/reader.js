export function initial(pack){return {id:pack.id,version:pack.version,n:-1,p:0,e:0,page:0,o:0,c:0,route:[],history:[]};}
export const nodeAt=(pack,i)=>pack.nodeAt?pack.nodeAt(i):pack.nodes[i];
export const nodeCount=pack=>pack.nodeCount??pack.nodes.length;
const position=s=>[s.n,s.p,s.e,s.page,s.o,s.route.length,s.c||0].join(',');
function assign(s,a){const values=typeof a==='string'?a.split(',').map(Number):a;[s.n,s.p,s.e,s.page,s.o]=values;s.route=s.route.slice(0,values[5]);s.c=values[6]||0;}
export function current(pack,s){if(s.n===-1)return {type:'opening'};return nodeAt(pack,s.n);}
export function phrase(pack,s){const n=current(pack,s);return n.type==='choice'?n.options[s.o].phrases[s.p]:n.phrases?.[s.p];}
function seek(pack,s){let count=0;while(nodeAt(pack,s.n)?.type==='goto'){s.n=nodeAt(pack,s.n).to;if(++count>nodeCount(pack))throw Error('Story loop');}if(!nodeAt(pack,s.n))throw Error('Missing node');}
export function advance(pack,s,pageCount=1){
 s.history.push(position(s));if(s.history.length>64)s.history.shift();
 const n=current(pack,s);
 if(n.type==='end'){s.history.pop();return s;}
 if(n.type==='opening'){s.n=pack.entry;return s;}
 if(n.type==='reaction'||n.type==='animation'){s.n++;seek(pack,s);return s;}
 if(s.page+1<pageCount){s.page++;return s;}s.page=0;
 const list=n.type==='choice'?n.options[s.o].phrases:n.phrases;
 if(s.p+1<list.length){s.p++;s.e=0;return s;}
 if(n.type==='choice'&&!s.c){s.page=pageCount-1;s.c=1;return s;}
 if(n.type==='choice'){s.route.push({id:n.id,option:n.options[s.o].id});s.n=n.options[s.o].to;}else s.n++;
 s.p=0;s.e=0;s.o=0;s.c=0;seek(pack,s);return s;
}
export function previous(s){if(s.history.length)assign(s,s.history.pop());return s;}
export function browse(pack,s,delta){const n=current(pack,s);if(n.type!=='choice')return s;s.o=(s.o+delta+n.options.length)%n.options.length;s.p=0;s.e=0;s.page=0;s.c=0;return s;}
export function restore(pack,s){
 if(!s||s.id!==pack.id||s.version!==pack.version)return initial(pack);
 try{if(!Array.isArray(s.history)||!Array.isArray(s.route)||s.history.length>64)throw Error();
 const n=current(pack,s);if(!n||!Number.isInteger(s.n)||!Number.isInteger(s.p)||!Number.isInteger(s.o)||!Number.isInteger(s.page)||s.page<0||s.page>100||![0,1].includes(s.e))throw Error();
 if(n.type==='choice'&&(!n.options[s.o]||!n.options[s.o].phrases[s.p]))throw Error();
 if(n.type==='line'&&!n.phrases[s.p])throw Error();return s;
 }catch{return initial(pack);}
}

export function toggleChinese(s){s.e=s.e?0:1;s.page=0;s.c=0;return s;}

// Reposition by story content when portrait cues change node indices.
export function migrate(oldPack,next,s){
 if(oldPack.id!==next.id)return initial(next);
 if(oldPack.version===next.version)return restore(next,s);
 if(s.n===-1)return initial(next);
 const old=current(oldPack,s);
 const key=n=>n.type==='line'?n.type+':'+n.speaker+':'+n.phrases.map(p=>p.zh).join(''):n.type==='choice'?'choice:'+n.id:n.type==='animation'?'animation:'+n.id:n.type==='reaction'?'reaction:'+n.actor+':'+n.emotion+':'+n.scene:n.type;
 const anchor=key(old);
 for(let i=0;i<nodeCount(next);i++)if(key(nodeAt(next,i))===anchor){return restore(next,{...s,version:next.version,n:i,e:0,c:0,page:0,history:[]});}
 return initial(next);
}

export function migrateLegacy(pack,s,legacy){
 if(s.id!==legacy.id||s.version!==legacy.version||pack.id!==legacy.id||pack.version!==legacy.target)return initial(pack);
 const n=s.n===-1?-1:typeof legacy.indices==='string'?legacy.indices.charCodeAt(s.n)-33:legacy.indices[s.n];if(n===undefined||n< -1)return initial(pack);
 return restore(pack,{...s,version:pack.version,n,e:0,c:0,page:0,history:[]});
}
