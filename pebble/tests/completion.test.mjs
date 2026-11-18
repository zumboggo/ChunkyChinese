import test from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
import {beginRun,completionEvent,enqueue,acknowledge} from '../reader/src/embeddedjs/completion.js';
import {initial,advance,current} from '../reader/src/embeddedjs/reader.js';
import fs from 'node:fs';
const factory=createRequire(import.meta.url)('../reader/src/pkjs/garden.js');
const pack=JSON.parse(fs.readFileSync(new URL('../content/supportive-12.json',import.meta.url)));
test('all 16 complete routes earn one credit; partial/legacy reads and replayed endings do not earn extras',()=>{
 for(let route=0;route<16;route++){
  const s=initial(pack);assert.equal(completionEvent(pack,s),null);beginRun(s,1000+route,.5);let q=[],choices=0,guard=0;
  while(current(pack,s).type!=='end'){
   assert.equal(completionEvent(pack,s),null);if(current(pack,s).type==='choice'&&!s.c)s.o=(route>>choices)&1;
   const before=s.route.length;advance(pack,s);if(s.route.length>before)choices++;assert.ok(++guard<500);
  }
  assert.equal(choices,4);const first=completionEvent(pack,s,2000);q=enqueue(q,first);q=enqueue(q,completionEvent(pack,s,3000));assert.equal(q.length,1);assert.equal(q[0].at,2000);
  const restored=JSON.parse(JSON.stringify(s));assert.deepEqual(completionEvent(pack,restored,4000),first);assert.deepEqual(acknowledge(q,first.id),[]);
  const legacy={...s,runId:undefined};assert.equal(completionEvent(pack,legacy),null);
 }
});
test('phone retains offline credit across restart and accepts only matching server acknowledgment',()=>{
 const map=new Map(),requests=[],sent=[],timers=[];const storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)};
 function Request(){requests.push(this);this.open=()=>{};this.setRequestHeader=()=>{};this.send=s=>this.body=JSON.parse(s);}
 const create=()=>factory({sendAppMessage:m=>sent.push(m)},storage,Request,f=>timers.push(f));
 let g=create(),e={id:'pebble-abc-def',episode:'supportive-12',at:1700000000000};g.receive(JSON.stringify(e));assert.equal(requests.length,0);assert.equal(JSON.parse(map.get('garden-outbox')).length,1);
 g.configure('a'.repeat(43));assert.equal(requests.length,1);requests[0].onerror();assert.equal(JSON.parse(map.get('garden-outbox')).length,1);
 g=create();g.flush();const x=requests.at(-1);x.status=200;x.responseText=JSON.stringify({ack:'wrong'});x.onload();assert.equal(JSON.parse(map.get('garden-outbox')).length,1);
 timers.at(-1)();const y=requests.at(-1);y.status=200;y.responseText=JSON.stringify({ack:e.id});y.onload();assert.equal(JSON.parse(map.get('garden-outbox')).length,0);assert.equal(sent.at(-1).COMMAND,'CREDIT_ACK');
 g.receive(JSON.stringify(e));assert.equal(requests.at(-1).body.completion.id,e.id); // Server deduplicates a lost watch ACK.
});

test('Episode 12 has six directed scenes and uses an installed cover',()=>{
 assert.equal(pack.nodes.filter(n=>n.type==='animation').length,6);
 assert.equal(pack.cover,'Alden-thoughtful-full');
 assert.equal(pack.nodes.filter(n=>n.type==='reaction'&&['Boe','Jeremy'].includes(n.actor)).length,0);
});
