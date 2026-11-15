import {CreditQueue} from '../reader/src/embeddedjs/credit-queue.js';
import * as offline from '../reader/src/embeddedjs/offline.js';
import * as nativeScenes from '../reader/src/embeddedjs/scenes-native.js';
import * as reactions from '../reader/src/embeddedjs/reactions.js';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import * as reader from '../reader/src/embeddedjs/reader.js';import * as completion from '../reader/src/embeddedjs/completion.js';import * as transfer from '../reader/src/embeddedjs/transfer.js';import * as layout from '../reader/src/embeddedjs/layout.js';import * as catalogue from '../reader/src/embeddedjs/catalogue.js';import {openWire} from '../reader/src/embeddedjs/wire.js';
const episode=(number=13)=>({format:1,id:'supportive-'+number,number,title:'Story '+number,version:'abcdef123456',chinese:false,entry:0,nodes:[{type:'line',speaker:'Alden',phrases:[{py:'hi',en:'hello'}]},{type:'end'}]});
function watch(store=new Map(),files=new Map()){
 const sent=[],labels=[];let channel;
 class Poco{static Font=class{};constructor(){this.Font=Poco.Font;}makeColor(){return 1;}begin(){labels.length=0;}end(){}fillRectangle(){}drawText(t){labels.push(t);}getTextWidth(t){return t.length*7;}}
 const context={CreditQueue,...offline,...nativeScenes,...reactions,...reader,...completion,...transfer,...layout,...catalogue,openWire,Debug:{gc(){}},graphics:{readerControls(){},clockFront(){},memoryFree(){return 20000;},portraitReady(){return 1;},cardData(index,value){context.card||={title:'',number:0};if(index===80)context.card.number=value;else context.card.title=context.card.title.slice(0,index)+String.fromCharCode(value);},setBackgroundMotion(){},showPortrait(){},showScene(){},recipeData(){return 1;}},Poco,screen:{},Button:class{},Message:class{constructor(options){channel=this;Object.assign(this,options);}write(m){sent.push(Object.fromEntries(m));}read(){return this.inbox;}},bundled:episode(),legacy:{},upgrade:{},sceneIds:{},sceneNames:[],sceneGroups:[],glyphs:'hiloe ',art:()=>1,console:{log(){}},localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},device:{files:{delete:p=>files.delete(p),openFile({path,size}){if(size!==undefined)files.set(path,' '.repeat(size));if(!files.has(path))throw Error('Missing file');return {status:()=>({size:files.get(path).length}),read:(n,o)=>files.get(path).slice(o,o+n),write:(v,o)=>{const s=files.get(path);files.set(path,s.slice(0,o)+v.value+s.slice(o+v.byteLength));},close(){}};}}}};
 vm.createContext(context);vm.runInContext('String.fromArrayBuffer=x=>x;ArrayBuffer.fromString=s=>({value:s,byteLength:s.length});',context);
 const source=fs.readFileSync(new URL('../reader/src/embeddedjs/main.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
 vm.runInContext(source+'\nglobalThis.api={input,save,get:()=>({pack,state,overlay,cataloguePage,requestedEpisode}),openCatalogue,completed};',context);
 function receive(m){channel.inbox=new Map(Object.entries(m));channel.onReadable();channel.onWritable();channel.onWritable();channel.onWritable();}
 const input=k=>{context.api.input(k);channel.onWritable();};channel.onWritable();
 function download(p){const meta={...p,nodeCount:p.nodes.length};delete meta.nodes;const wire=[meta,...p.nodes].map(JSON.stringify).join('\n')+'\n';receive({COMMAND:'BEGIN',TOTAL:wire.length,CHECKSUM:transfer.checksum(wire),VERSION:p.version});for(let i=0;i<wire.length;i+=600){let data=wire.slice(i,i+600);receive({COMMAND:'CHUNK',OFFSET:i,DATA:data,CHECKSUM:transfer.checksum(data)});}receive({COMMAND:'END'});}
 return {disconnect:()=>channel.onSuspend(),card:()=>context.card,api:context.api,input,receive,download,sent,labels,store,files};
}
const entry=n=>['supportive-'+n,n,'Story '+n,'abcdef123456'];
function list(w,items=[entry(11),entry(12),entry(13)]){w.input('back');for(let i=0;i<5;i++)w.input('down');w.input('select');w.input('select');const request=w.sent.filter(m=>m.COMMAND==='CATALOG').at(-1);w.receive({COMMAND:'CATALOG',VERSION:request.VERSION,DATA:JSON.stringify({kind:'11',offset:0,total:items.length,items})});}
test('watch Library selects by ID, rejects wrong download, and restores per-episode position',()=>{
 const w=watch();w.input('select');assert.equal(w.api.get().state.n,0);list(w);w.input('down');w.input('select');w.input('select');assert.equal(w.sent.at(-1).DATA,'supportive-12');
 w.download(episode(11));assert.equal(w.api.get().pack.id,'supportive-13');w.download(episode(12));assert.equal(w.api.get().pack.id,'supportive-12');assert.equal(w.api.get().overlay,null);assert.equal(w.card().title,'Story 12');assert.equal(w.card().number,12);
 w.input('select');assert.equal(w.api.get().state.n,0);list(w);w.input('down');w.input('down');w.input('select');w.input('select');assert.equal(w.api.get().pack.id,'supportive-13');assert.equal(w.api.get().state.n,0);
 list(w);w.input('down');w.input('select');w.input('select');w.download(episode(12));assert.equal(w.api.get().state.n,0);
});
test('completion survives restarting, switching, acknowledgement and app relaunch; partial reads stay incomplete',()=>{
 const w=watch();w.input('select');assert.equal(w.api.completed('supportive-13'),false);w.input('select');assert.equal(w.api.completed('supportive-13'),true);const id=w.api.get().state.runId;w.receive({COMMAND:'CREDIT_ACK',DATA:id});
 w.input('back');for(let i=0;i<4;i++)w.input('down');w.input('select');w.input('down');w.input('select');assert.equal(w.api.get().state.n,-1);assert.equal(w.api.completed('supportive-13'),true);
 const again=watch(w.store,w.files);assert.equal(again.api.completed('supportive-13'),true);list(again);assert.ok(again.labels.some(t=>t.startsWith('[x] 13.')));assert.equal(again.api.completed('supportive-12'),false);
});
test('stale catalogue response cannot change selection, and offline current episode remains readable',()=>{
 const w=watch();list(w);w.input('down');w.input('down');w.input('select');w.receive({COMMAND:'CATALOG',VERSION:'0',DATA:'bad'});assert.equal(w.api.get().overlay,'episode');w.input('select');assert.equal(w.api.get().overlay,null);assert.equal(w.api.get().pack.id,'supportive-13');
});

function plan(w,n=13,count=5){w.receive({COMMAND:'HELLO'});const q=w.sent.filter(m=>m.COMMAND==='QUEUE').at(-1);w.receive({COMMAND:'PLAN',VERSION:q.VERSION,DATA:JSON.stringify(Array.from({length:count},(_,i)=>entry(n+i+1)))});}
test('next five downloads do not replace current reading, survive relaunch, and continue offline',()=>{
 const w=watch();w.input('select');plan(w);for(let n=14;n<=18;n++){assert.equal(w.sent.filter(m=>m.COMMAND==='PREFETCH').at(-1).DATA,'supportive-'+n);w.download(episode(n));assert.equal(w.api.get().pack.id,'supportive-13');assert.equal(w.api.get().state.n,0);}
 assert.equal(JSON.parse(w.store.get('offline-index')).length,5);
 const again=watch(w.store,w.files);again.disconnect();again.input('select');again.input('select');assert.equal(again.api.get().overlay,'finished');again.input('select');assert.equal(again.api.get().pack.id,'supportive-14');assert.equal(again.api.get().state.n,-1);assert.ok(!again.sent.some(m=>m.COMMAND==='LOAD'));
 const resumed=watch(w.store,w.files);assert.equal(resumed.api.get().pack.id,'supportive-14');
});
test('stale queue plans and transfer tokens cannot replace the selected episode',()=>{
 const w=watch();plan(w);const token=w.sent.filter(m=>m.COMMAND==='PREFETCH').at(-1).STATUS;
 w.receive({COMMAND:'PLAN',VERSION:'0',DATA:'invalid'});w.receive({COMMAND:'BEGIN',STATUS:'stale',TOTAL:100,CHECKSUM:'1',VERSION:'abcdef123456'});
 assert.equal(w.api.get().pack.id,'supportive-13');w.download(episode(14));assert.equal(w.api.get().pack.id,'supportive-13');
 w.receive({COMMAND:'END',STATUS:token});assert.equal(w.api.get().pack.id,'supportive-13');assert.equal(JSON.parse(w.store.get('offline-index')).length,1);
});
test('no unpublished successors means an empty queue, not a repeated current episode download',()=>{
 const w=watch();plan(w,13,0);assert.ok(!w.sent.some(m=>m.COMMAND==='PREFETCH'));assert.equal(w.api.get().pack.id,'supportive-13');
});

test('included next episode continues offline without occupying a queue slot',()=>{const w=watch();w.download(episode(12));w.disconnect();w.input('select');w.input('select');w.input('select');assert.equal(w.api.get().overlay,'finished');w.input('select');assert.equal(w.api.get().pack.id,'supportive-13');});
