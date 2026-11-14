import test from 'node:test';import assert from 'node:assert/strict';
import {Offline,nextPlan} from '../reader/src/embeddedjs/offline.js';
function setup(){let index='',fail=false,capacity=1e6;const files=new Map();const io={get:()=>index,set:s=>{if(fail)throw Error('Full');index=s;},remove:p=>files.delete(p),create(p,n){if([...files.values()].reduce((a,b)=>a+b,0)+n>capacity)throw Error('Full');files.set(p,n);}};return {cache:new Offline(io),io,files,setFail:v=>fail=v,setCapacity:v=>capacity=v};}
const pack=n=>({id:'supportive-'+n,number:n,title:'Story '+n,version:'abcdef123456'});
test('bounded rolling cache keeps current plus next five and a free staging slot',()=>{
 const t=setup();for(let n=13;n<=18;n++){t.cache.begin(21000);t.cache.commit(pack(n),pack(13));}
 assert.equal(t.cache.items.length,6);assert.equal(t.files.size,6);const old=t.cache.path(t.cache.find('supportive-13'));
 t.cache.begin(22000);t.cache.commit(pack(19),pack(14));assert.ok(t.cache.find('supportive-14'));assert.ok(t.cache.find('supportive-19'));assert.equal(t.cache.items.length,6);assert.ok(!t.files.has(old));assert.equal(new Offline(t.io).items.length,6);
});
test('failed allocation or index commit preserves all previously readable episodes',()=>{
 const t=setup();t.cache.begin(21000);t.cache.commit(pack(14),pack(13));const path=t.cache.path(t.cache.find('supportive-14'));
 t.setCapacity(21001);assert.throws(()=>t.cache.begin(21000));assert.ok(t.files.has(path));
 t.setCapacity(1e6);t.cache.begin(22000);t.setFail(true);assert.throws(()=>t.cache.commit({...pack(14),version:'abcdef123457'},pack(13)));assert.equal(t.cache.find('supportive-14')[3],'abcdef123456');assert.ok(t.files.has(path));assert.equal(new Offline(t.io).find('supportive-14')[3],'abcdef123456');
});
test('capacity probe removes only its own files, including on insufficient storage',()=>{
 const t=setup();t.cache.begin(21000);t.cache.commit(pack(14),pack(13));t.setCapacity(21000+3*65536);assert.equal(t.cache.probe(),3*65536);assert.equal(t.files.size,1);assert.equal(t.cache.bytes(),21000);
});
test('queue plans reject gaps, other series, excessive count and malformed entries',()=>{
 const e=n=>['supportive-'+n,n,'Story '+n,'abcdef123456'];assert.deepEqual(nextPlan([e(14),e(15)],pack(13)),[e(14),e(15)]);assert.throws(()=>nextPlan([e(15)],pack(13)));assert.throws(()=>nextPlan([['other-14',14,'Other','abcdef123456']],pack(13)));assert.throws(()=>nextPlan(Array.from({length:6},(_,i)=>e(i+14)),pack(13)));
});
test('a missing index never lets a new transfer overwrite the active slot',()=>{
 const t=setup();t.files.set('offline-0',21000);assert.equal(t.cache.begin(22000,'offline-0'),'offline-1');assert.equal(t.files.get('offline-0'),21000);
});
