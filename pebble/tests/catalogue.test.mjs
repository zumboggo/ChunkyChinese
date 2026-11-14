import test from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
import {validPage,actions} from '../reader/src/embeddedjs/catalogue.js';
const factory=createRequire(import.meta.url)('../reader/src/pkjs/catalogue.js');
const entries=n=>({schema:1,episodes:Array.from({length:n},(_,i)=>({id:'supportive-'+(i+1),number:i+1,title:'Story '+(i+1),version:'abcdef123456'}))});
function setup(){const requests=[],map=new Map(),storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)};function X(){requests.push(this);this.open=(method,url)=>this.url=url;this.send=()=>{};}const c=factory(storage,X,'https://example.test/content/');return {c,requests,map,reply(body,status=200){const x=requests.at(-1);x.responseText=JSON.stringify(body);x.status=status;x.onload();}};}
test('150 episodes use 15 ranges and bounded five-item pages, including late episodes',()=>{
 const {c}=setup(),all=c.validate(entries(150));let p=c.page(all,'groups',10,false);assert.equal(p.total,15);assert.deepEqual(p.items[4],[141,150]);validPage(p);
 p=c.page(all,'141',5,false);assert.deepEqual(p.items.map(x=>x[1]),[146,147,148,149,150]);validPage(p);assert.ok(actions(p).includes('Previous page'));assert.ok(!actions(p).includes('Next page'));assert.ok(JSON.stringify(p).length<900);
 const max=entries(2000);max.episodes.forEach(e=>{e.title='x'.repeat(80);e.id='x'.repeat(40)+'-'+e.number;});p=c.page(c.validate(max),'1991',5,false);validPage(p);assert.ok(JSON.stringify(p).length<950);
});
test('invalid or duplicate catalogues cannot replace saved metadata; offline uses last good list',()=>{
 const t=setup();let result,error;t.c.list('groups',0,p=>result=p,e=>error=e);t.reply(entries(120));assert.equal(result.total,12);const saved=t.map.get('episode-catalogue');
 const bad=entries(2);bad.episodes[1].id=bad.episodes[0].id;t.c.list('groups',0,()=>assert.fail(),e=>error=e);t.reply(bad);assert.ok(error);assert.equal(t.map.get('episode-catalogue'),saved);
 t.c.list('111',0,p=>result=p,()=>assert.fail());t.requests.at(-1).onerror();assert.equal(result.offline,true);assert.equal(result.items[0][1],111);
});
test('selected episode loads only its canonical feed and must match catalogue identity/version',()=>{
 const t=setup();let result,error;t.c.load('supportive-120',p=>result=p,e=>error=e);t.reply(entries(150));assert.match(t.requests.at(-1).url,/content\/supportive-120.json/);t.reply({id:'supportive-119',version:'abcdef123456'});assert.equal(result,undefined);assert.match(error,/updating/);
 t.c.load('../private',()=>assert.fail(),e=>error=e);assert.match(error,/Invalid/);
 t.c.load('supportive-151',()=>assert.fail(),e=>error=e);t.reply(entries(150));assert.match(error,/not published/);
});
test('new selection supersedes older asynchronous fetch',()=>{
 const t=setup();let loaded=[];t.c.load('supportive-1',p=>loaded.push(p.id),()=>{});t.reply(entries(2));const old=t.requests.at(-1);
 t.c.load('supportive-2',p=>loaded.push(p.id),()=>{});t.reply(entries(2));t.reply({id:'supportive-2',version:'abcdef123456'});
 old.status=200;old.responseText=JSON.stringify({id:'supportive-1',version:'abcdef123456'});old.onload();assert.deepEqual(loaded,['supportive-2']);
});
test('watch rejects malformed pages and accepts empty catalogue',()=>{
 assert.throws(()=>validPage({kind:'groups',offset:0,total:2001,items:[]}));
 assert.throws(()=>validPage({kind:'1',offset:0,total:1,items:[['../secret',1,'Bad','abcdef123456']]}));
 validPage({kind:'groups',offset:0,total:0,items:[]});
});
