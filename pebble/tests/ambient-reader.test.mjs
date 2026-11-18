import * as nativeScenes from '../reader/src/embeddedjs/scenes-native.js';
import * as reactions from '../reader/src/embeddedjs/reactions.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as catalogue from '../reader/src/embeddedjs/catalogue.js';
import * as completion from '../reader/src/embeddedjs/completion.js';
import * as reader from '../reader/src/embeddedjs/reader.js';
import * as layout from '../reader/src/embeddedjs/layout.js';
import {sceneIds,sceneNames,sceneGroups} from '../reader/src/embeddedjs/scenes.js';
const bundled=JSON.parse(fs.readFileSync(new URL('../reader/src/pkjs/bundled.json',import.meta.url)));
function harness(storage=new Map(),files=new Map()){
 String.fromArrayBuffer=b=>new TextDecoder().decode(b);ArrayBuffer.fromString=s=>new TextEncoder().encode(s).buffer;
 const calls=[],labels=[];let selectResult=1;
 const graphics={portraitReady(){return selectResult;},cardData(index,value){calls.push(['card',index,value]);},recipeData(i,v){calls.push(['recipe',i,v]);return 1;},showPortrait(){},showScene(id){calls.push(['scene',id]);},setBackgroundMotion(on){calls.push(['ambient',on]);},sceneSelect(){return selectResult;}};
 class Poco{Font=class{};makeColor(){return 0;}getTextWidth(t){return t.length*10;}begin(){labels.length=0;}end(){}fillRectangle(){}drawText(t,f,c,x,y){labels.push({t,y});}}
 const localStorage={getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
 const deps={...nativeScenes,...reactions,...catalogue,...completion,...reader,...layout,bundled,legacy:{},upgrade:{},sceneIds,sceneNames,sceneGroups,glyphs:'',art:()=>0,Debug:{gc(){}},graphics,Poco,screen:{},Button:class{},Message:class{},Transfer:class{},validate(){},checksum(){},openWire(){},localStorage,device:{files:{delete:p=>files.delete(p),openFile({path,mode}){if(mode)files.set(path,'');if(!files.has(path))throw Error('No saved file');return {status:()=>({size:ArrayBuffer.fromString(files.get(path)).byteLength}),read:()=>ArrayBuffer.fromString(files.get(path)),write:b=>files.set(path,String.fromArrayBuffer(b)),close(){}};}}},console:{log(){}}};
 const source=fs.readFileSync(new URL('../reader/src/embeddedjs/main.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
 const app=new Function(...Object.keys(deps),source+'\nreturn {input,menuItems,switchEpisode,get state(){return state;},get overlay(){return overlay;}};')(...Object.values(deps));
 return {app,calls,labels,storage,setResult:r=>selectResult=r};
}
test('native preview groups are catalogue-driven, scroll within screen and preserve reading state',()=>{
 const h=harness(),before=JSON.stringify(h.app.state);
 h.app.input('back');h.app.input('down');h.app.input('down');h.app.input('select');
 const groups=[...new Set(sceneGroups)];assert.deepEqual(h.app.menuItems(),[...groups,'Back']);
 for(let g=0;g<groups.length;g++){
  h.app.input('select');const ids=sceneGroups.flatMap((group,i)=>group===groups[g]?[i+1]:[]);
  assert.deepEqual(h.app.menuItems(),[...ids.map(id=>sceneNames[id-1]),'Back']);
  for(const id of ids){h.app.input('select');assert.deepEqual(h.calls.at(-1),['scene',id]);h.setResult(0);h.app.input('select');assert.equal(h.app.overlay,null);h.setResult(1);h.app.input('down');assert.deepEqual(h.calls.at(-1),['scene',id]);h.app.input('select');assert.equal(h.app.overlay,'scene-list');assert.ok(h.labels.every(x=>x.y<=208));h.app.input('down');}
  h.app.input('back');h.app.input('down');
 }
 assert.equal(JSON.stringify(h.app.state),before);
});
test('background toggle persists independently of episode progress and defaults on',()=>{
 const h=harness();assert.deepEqual(h.calls[0],['ambient',1]);h.app.input('back');for(let i=0;i<3;i++)h.app.input('down');h.app.input('select');assert.equal(h.storage.get('backgroundMotion'),'0');assert.deepEqual(h.calls.at(-1),['ambient',0]);
 const restart=harness(h.storage);assert.deepEqual(restart.calls[0],['ambient',0]);assert.deepEqual(restart.app.state,h.app.state);
});

test('new bundled episode archives the old position and switching restores it',()=>{
 const old={...bundled,id:'previous-11',version:'111111111111'},saved=reader.initial(old);
 saved.n=old.nodes.findIndex(n=>n.type==='line');saved.p=1;
 const files=new Map([['progress-0',JSON.stringify({generation:99,state:saved})]]);
 const h=harness(new Map(),files);assert.equal(h.app.state.id,bundled.id);
 assert.deepEqual(JSON.parse(files.get('saved-previous-11')),saved);
 h.app.switchEpisode(old);assert.deepEqual(h.app.state,saved);
 h.app.switchEpisode(bundled);assert.equal(h.app.state.id,bundled.id);assert.equal(h.app.state.n,-1);
});

test('downloaded scenes use their data bridge, preserve hold guard, and replay the same recipe',()=>{
 const h=harness(),wire='1,1,0,0,0,2,0,0,0,0,0,3400,0,0,0,0';
 h.app.switchEpisode({id:'supportive-999',version:'abcdef123456',entry:0,nodes:[{type:'animation',id:'download-pause',recipe:wire},{type:'end'}]});
 h.app.input('select');assert.deepEqual(h.calls.at(-1),['recipe',46,1]);
 h.setResult(0);h.app.input('select');assert.equal(h.app.state.n,0);
 const before=h.calls.filter(c=>c[0]==='recipe');h.app.input('down');assert.deepEqual(h.calls.filter(c=>c[0]==='recipe').slice(before.length),before);
 h.setResult(1);h.app.input('select');assert.equal(h.app.state.n,1);
});

test('pinyin-only upgrade keeps the phrase and routes and Down opens controls',()=>{
 if(bundled.chinese!==false)return;
 const state=reader.initial(bundled);state.version=bundled.textVersion;state.n=bundled.nodes.findIndex(n=>n.type==='line');state.p=0;state.e=1;state.route=[{id:'past-choice',option:'a'}];
 const files=new Map([['progress-0',JSON.stringify({generation:3,state})]]),h=harness(new Map([['readerRevision','3']]),files);
 assert.equal(h.app.state.n,state.n);assert.equal(h.app.state.p,state.p);assert.equal(h.app.state.e,0);assert.deepEqual(h.app.state.route,state.route);
 h.app.input('down');assert.equal(h.app.overlay,'menu');assert.equal(h.app.state.n,state.n);
});

test('reaction completion gates Select, replay keeps position, and exit preserves progress',()=>{
 const h=harness();h.app.switchEpisode({id:'supportive-998',version:'abcdef123456',entry:0,nodes:[{type:'reaction',actor:'Hannah',emotion:'warm'},{type:'reaction',actor:'Hannah',emotion:'warm'},{type:'end'}]});
 h.app.input('select');assert.equal(h.app.state.n,0);
 h.setResult(0);h.app.input('select');assert.equal(h.app.state.n,0);
 h.app.input('down');assert.equal(h.app.state.n,0);
 h.setResult(1);h.app.input('select');assert.equal(h.app.state.n,1);
 h.setResult(0);h.app.input('select');assert.equal(h.app.state.n,1);
 h.app.input('back');assert.equal(h.app.overlay,'menu');assert.equal(h.app.state.n,1);
});
