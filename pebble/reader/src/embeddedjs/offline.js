// Seven bounded files: current + five ahead + one uncommitted transfer.
export const OFFLINE_LIMIT=5, SLOT_COUNT=7, EPISODE_BYTES=65536;
export function nextPlan(items,pack){
 if(!Array.isArray(items)||items.length>5)throw Error('Invalid offline list');
 const prefix=pack.id.replace(/-\d+(?:-v\d+)?$/,'');
 for(let i=0;i<items.length;i++){const e=items[i];if(!Array.isArray(e)||e.length!==4||typeof e[0]!=='string'||!/^[-a-z0-9]+$/.test(e[0])||e[0].length>48||e[0].replace(/-\d+(?:-v\d+)?$/,'')!==prefix||e[1]!==pack.number+i+1||typeof e[2]!=='string'||e[2].length>80||!/^[ -~]+$/.test(e[2])||!/^\w{12}$/.test(e[3]))throw Error('Invalid offline list');}
 return items;
}
export class Offline {
 constructor(io){this.io=io;this.valid=false;try{const a=JSON.parse(io.get()||'[]');if(!Array.isArray(a)||a.length>6)throw Error();const slots=[];for(const e of a){if(!Array.isArray(e)||e.length!==6||typeof e[0]!=='string'||!/^[-a-z0-9]+$/.test(e[0])||!Number.isInteger(e[1])||e[1]<1||typeof e[2]!=='string'||e[2].length>80||!/^\w{12}$/.test(e[3])||!Number.isInteger(e[4])||e[4]<0||e[4]>=7||slots.includes(e[4])||!Number.isInteger(e[5])||e[5]<1||e[5]>65536)throw Error();slots.push(e[4]);}this.valid=true;}catch{}}
 // Index rows are needed only for library actions, never retained during reading.
 get items(){return this.valid?JSON.parse(this.io.get()||'[]'):[];}
 find(id){return this.items.find(e=>e[0]===id);}
 path(e){return 'offline-'+e[4];}
 begin(size,protectedPath){if(size<1||size>EPISODE_BYTES)throw Error('Episode too large');const items=this.items;let slot=0;while('offline-'+slot===protectedPath||items.some(e=>e[4]===slot))slot++;if(slot>=SLOT_COUNT)throw Error('Offline cache full');const path='offline-'+slot;this.io.remove(path);this.io.create(path,size);this.pending=[slot,size];return path;}
 commit(pack,current){if(!this.pending)throw Error('No offline download');const [slot,size]=this.pending;const e=[pack.id,pack.number,String(pack.shortTitle||pack.title).slice(0,80),pack.version,slot,size];let a=this.items.filter(x=>x[0]!==pack.id);a.push(e);a=[...a.filter(x=>x[0]===current.id&&x!==e),e,...a.filter(x=>x!==e&&x[0]!==current.id&&x[1]>current.number).sort((x,y)=>x[1]-y[1]).slice(0,current.id===pack.id?5:4)];this.store(a);this.pending=null;return e;}
 trim(a,current){const active=a.filter(e=>e[0]===current.id);const future=a.filter(e=>e[0]!==current.id&&e[1]>current.number).sort((x,y)=>x[1]-y[1]).slice(0,5);return active.concat(future);}
 prune(current){this.store(this.trim(this.items,current));}
 store(a){const old=this.items;this.io.set(JSON.stringify(a));this.valid=true;for(const e of old)if(!a.some(x=>x[4]===e[4]))this.io.remove(this.path(e));}
 probe(){let count=0;try{for(;count<7;count++){const path='queue-probe-'+count;this.io.remove(path);this.io.create(path,EPISODE_BYTES);}}catch{}finally{for(let i=0;i<7;i++)this.io.remove('queue-probe-'+i);}return count*EPISODE_BYTES;}
 bytes(){return this.items.reduce((n,e)=>n+e[5],0);}
}
