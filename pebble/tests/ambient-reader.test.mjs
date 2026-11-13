import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as reader from '../reader/src/embeddedjs/reader.js';
import * as layout from '../reader/src/embeddedjs/layout.js';
import {sceneIds,sceneNames,sceneGroups} from '../reader/src/embeddedjs/scenes.js';
const bundled=JSON.parse(fs.readFileSync(new URL('../reader/src/pkjs/bundled.json',import.meta.url)));
function harness(storage=new Map()){
 const calls=[],labels=[];let selectResult=1;
 const graphics={showPortrait(){},showScene(id){calls.push(['scene',id]);},setBackgroundMotion(on){calls.push(['ambient',on]);},sceneSelect(){return selectResult;}};
 class Poco{Font=class{};makeColor(){return 0;}getTextWidth(t){return t.length*10;}begin(){labels.length=0;}end(){}fillRectangle(){}drawText(t,f,c,x,y){labels.push({t,y});}}
 const localStorage={getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
 const deps={...reader,...layout,bundled,legacy:{},upgrade:{},sceneIds,sceneNames,sceneGroups,glyphs:'',art:{},Debug:{gc(){}},graphics,Poco,screen:{},Button:class{},Message:class{},Transfer:class{},validate(){},checksum(){},openWire(){},localStorage,device:{files:{openFile(){throw Error('No saved file');}}},console:{log(){}}};
 const source=fs.readFileSync(new URL('../reader/src/embeddedjs/main.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
 const app=new Function(...Object.keys(deps),source+'\nreturn {input,menuItems,get state(){return state;},get overlay(){return overlay;}};')(...Object.values(deps));
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
