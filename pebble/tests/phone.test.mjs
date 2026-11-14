import {createRequire} from 'node:module';
const catalogueFactory=createRequire(import.meta.url)('../reader/src/pkjs/catalogue.js');
const gardenFactory=createRequire(import.meta.url)('../reader/src/pkjs/garden.js');
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {checksum,Transfer,validate} from '../reader/src/embeddedjs/transfer.js';import {openWire} from '../reader/src/embeddedjs/wire.js';
import {selectedPack} from '../scripts/episode-target.mjs';
const pack=selectedPack(new URL('../',import.meta.url),process.env.PEBBLE_EPISODE_ID);
const glyphs=fs.readFileSync(new URL('../content/glyphs.txt',import.meta.url),'utf8');
function companion(){const sent=[],events={},timers=[];const store=new Map();const context={require:n=>n==='./garden'?gardenFactory:n==='./catalogue'?catalogueFactory:pack,XMLHttpRequest:function(){},console,localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},setTimeout:f=>(timers.push(f),timers.length),clearTimeout(){},Pebble:{addEventListener:(k,f)=>events[k]=f,sendAppMessage:(m,ok)=>{sent.push(m);ok?.();}}};vm.createContext(context);vm.runInContext(fs.readFileSync(new URL('../reader/src/pkjs/index.js',import.meta.url),'utf8'),context);return {context,sent,events,timers};}
test('portable Adler-32 known vector and phone/watch parity',()=>{const c=companion();assert.equal(checksum('Wikipedia'),'11e60398');assert.equal(checksum('hello'),'62c0215');assert.equal(c.context.hash('hello'),checksum('hello'));const text=c.context.wire(pack);assert.equal(checksum(text),c.context.hash(text));});
test('real companion protocol transfers every chunk then activates exactly once',()=>{const c=companion();let data='',active=null,activations=0;const t=new Transfer({begin(){data='';},write(s,o){assert.equal(o,data.length);data+=s;},complete(expected){return openWire(data.length,(o,n)=>data.slice(o,o+n),expected);},activate(p){active=p;activations++;}},p=>validate(p,glyphs,()=>true));c.context.begin(pack);let messages=0;while(c.sent.length){const m=c.sent.shift();let offset;if(m.COMMAND==='BEGIN')offset=t.begin(m.TOTAL,m.CHECKSUM,m.VERSION);else if(m.COMMAND==='CHUNK'){assert.equal(checksum(m.DATA),m.CHECKSUM);offset=t.chunk(m.OFFSET,m.DATA);}else if(m.COMMAND==='END'){t.finish();t.finish();c.events.appmessage({payload:{COMMAND:'DONE'}});break;}else assert.fail(m.COMMAND);c.events.appmessage({payload:{COMMAND:'ACK',OFFSET:offset}});assert.ok(++messages<Math.ceil(c.context.wire(pack).length/600)+4);}assert.equal(active.id,pack.id);assert.equal(activations,1);assert.equal(c.context.transfer,null);});
test('phone startup retries handshake and lost acknowledgements retry the same chunk',()=>{const c=companion();c.events.ready();assert.equal(c.sent[0].COMMAND,'HELLO');assert.ok(c.timers.length>=1);c.context.begin(pack);c.events.appmessage({payload:{COMMAND:'ACK',OFFSET:0}});const chunk=c.sent.at(-1);c.context.retry();assert.deepEqual(c.sent.at(-1),chunk);c.events.appmessage({payload:{COMMAND:'ERROR'}});assert.equal(c.context.transfer,null);});

test('refresh fetches a fresh URL; network failure retains the installed episode',()=>{
 const c=companion();let request;
 c.context.XMLHttpRequest=function(){request=this;this.open=(method,url)=>{this.url=url;};this.send=()=>this.onerror();};
 c.context.load();assert.match(request.url,/refresh=\d+/);assert.equal(c.sent.at(-1).COMMAND,'ERROR');assert.match(c.sent.at(-1).STATUS,/kept offline/);assert.equal(c.context.transfer,null);
});
test('phone settings Refresh button requests an immediate download',()=>{
 const c=companion();let count=0;c.context.XMLHttpRequest=function(){this.open=()=>{};this.send=()=>count++;};c.events.webviewclosed({response:encodeURIComponent(JSON.stringify({url:'',refresh:true}))});assert.equal(count,1);
});

test('startup handshake retries until watch acknowledges readiness',()=>{const c=companion();c.events.ready();c.context.hello();assert.equal(c.sent.filter(m=>m.COMMAND==='HELLO').length,2);c.events.appmessage({payload:{COMMAND:'READY'}});assert.equal(c.context.helloTimer,null);});

test('default Refresh URL follows the selected bundle',()=>{assert.ok(companion().context.DEFAULT_URL.endsWith('/'+pack.id+'.json'));});
