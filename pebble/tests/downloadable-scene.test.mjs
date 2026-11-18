import {analyse} from '../scripts/episode-analysis.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {execFileSync} from 'node:child_process';
import {encodeScene,validSceneWire} from '../scripts/downloadable-scene.mjs';import {validate} from '../reader/src/embeddedjs/transfer.js';import {exportEpisode} from '../scripts/export.mjs';
const recipe={actor:'boe',setting:'train',ambient:'train',prop:'none',keys:[[0,0,0,0,0],[1600,3,0,0,80],[2600,3,0,0,80],[4000,0,0,0,0]]},wire=encodeScene(recipe);
test('recipes export at stable anchors and old runtimes reject them',()=>{
 const source=JSON.parse(fs.readFileSync(new URL('../../stories/animated/supportive-11.json',import.meta.url))),direction=JSON.parse(fs.readFileSync(new URL('../direction/supportive-11.json',import.meta.url)));
 direction.cues[0]={...direction.cues[0],scene:'download-boe-pauses',recipe};
 const report=analyse('supportive-11',{source,direction});assert.deepEqual(report.errors,[]);assert.equal(report.recipeSchema,1);assert.ok(!report.sceneIds.includes('download-boe-pauses'));assert.deepEqual(report.shots.find(s=>s.recipe).recipe,recipe);
 const pack=exportEpisode(source,'supportive-11',direction);assert.equal(pack.nodes.find(n=>n.recipe).recipe,wire);
 const glyphs=fs.readFileSync(new URL('../content/glyphs.txt',import.meta.url),'utf8');assert.throws(()=>validate(pack,glyphs,()=>true),/recipe update/);validate(pack,glyphs,()=>true,validSceneWire);
 pack.nodes.find(n=>n.recipe).recipe='2,0';assert.throws(()=>validate(pack,glyphs,()=>true,validSceneWire));
});
test('native decoder agrees with authoring checks for malformed and unreachable poses',{skip:process.env.PEBBLE_WORKFLOW_CHILD==='1'},()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'pebble-recipe-'));try{
 const header=new URL('../reader/src/c/downloadable_scene.h',import.meta.url).pathname;
 fs.writeFileSync(path.join(tmp,'test.c'),'#define DOWNLOAD_TEXT_TEST\n#include <stdint.h>\n#include <stdbool.h>\n#include <stdio.h>\n#include <string.h>\ntypedef struct {uint16_t t;float dy,hx,hy,angle;} GestureKey;\n#include '+JSON.stringify(header)+'\nint main(void){char s[4096];DownloadScene d;while(fgets(s,sizeof(s),stdin)){s[strcspn(s,"\\n")]=0;printf("%d\\n",decode_scene(s,&d));}}\n');
 execFileSync('cc',['-std=c99','-Wall','-Werror',path.join(tmp,'test.c'),'-o',path.join(tmp,'test')]);
 const cases=[wire,'',wire+',',wire+',0','-1'+wire.slice(1),'0'.repeat(513)+wire,'1e0'+wire.slice(1),wire.replace(',1600,',',0,')];
 for(let actor=0;actor<6;actor++)for(let setting=0;setting<7;setting++)for(let ambient=0;ambient<7;ambient++)for(let hx=-32;hx<=26;hx+=7){const a=wire.split(',');a[1]=actor;a[2]=setting;a[3]=ambient;a[8]=hx;cases.push(a.join(','));}
 const native=execFileSync(path.join(tmp,'test'),[],{input:cases.join('\n')+'\n',encoding:'utf8'}).trim().split('\n').map(x=>x==='1');assert.deepEqual(native,cases.map(validSceneWire));assert.ok(native.some(Boolean));
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});

test('all six character profiles reuse four validated gestures without changing shipped actor IDs',async()=>{
 const {actors,recipeFromGesture}=await import('../scripts/downloadable-scene.mjs');const cast=JSON.parse(fs.readFileSync(new URL('../scenes/ensemble/characters.json',import.meta.url)));
 assert.deepEqual(actors.slice(0,3),['gorgon','boe','jeremy']);assert.deepEqual(actors.slice(3),['hannah','young-alden','alden']);
 for(const actor of actors)for(const action of Object.keys(cast.actions)){const r=recipeFromGesture(cast,actor,action,'home','foliage');assert.ok(validSceneWire(encodeScene(r)));assert.equal(r.actor,actor);}
});
