import test from 'node:test';import assert from 'node:assert/strict';
import {CreditQueue} from '../reader/src/embeddedjs/credit-queue.js';
function fixture(){const store=new Map(),files=new Map(),reads=[];const io={get:k=>store.get(k),set:(k,v)=>store.set(k,v),read:k=>{reads.push(k);return files.get(k);},write:(k,v)=>files.set(k,v),remove:k=>files.delete(k)};return {store,files,reads,io,q:new CreditQueue(io)};}
test('a large offline credit backlog reads only one event and retains unacknowledged credits',()=>{
 const f=fixture();for(let i=0;i<100;i++)f.q.enqueue({id:'run-'+i,episode:'supportive-13',at:i});f.reads.length=0;
 assert.equal(f.q.peek().id,'run-0');assert.equal(f.reads.length,1);f.q.acknowledge('wrong');assert.equal(f.q.peek().id,'run-0');
 for(let i=0;i<100;i++){assert.equal(f.q.peek().id,'run-'+i);f.q.acknowledge('run-'+i);}assert.equal(f.q.peek(),null);assert.equal(f.files.size,0);
});
test('legacy credits migrate incrementally and retry without dropping or duplicating an event',()=>{
 const f=fixture(),events=Array.from({length:30},(_,i)=>({id:'run-'+i,episode:'supportive-13',at:i}));f.store.set('episodeCredits',JSON.stringify(events));
 const write=f.io.write;let fail=true;f.io.write=(k,v)=>{if(k==='credit-7'&&fail){fail=false;throw Error('interrupted');}write(k,v);};assert.throws(()=>f.q.migrate());
 f.q=new CreditQueue(f.io);f.q.migrate();assert.equal(f.store.get('episodeCredits'),'');
 for(const event of events){assert.deepEqual(f.q.peek(),event);f.q.acknowledge(event.id);}assert.equal(f.q.peek(),null);
});
