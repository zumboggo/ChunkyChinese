import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {episodeId,selectedPack} from '../scripts/episode-target.mjs';
import {exportEpisode} from '../scripts/export.mjs';
import {loadDirection} from '../scripts/story-direction.mjs';
import {migrationMap} from '../scripts/migration-map.mjs';
import {validate} from '../reader/src/embeddedjs/transfer.js';
import {pages} from '../reader/src/embeddedjs/layout.js';
import art from '../reader/src/embeddedjs/art.js';
import legacy from '../reader/src/embeddedjs/legacy.js';
import upgrade from '../reader/src/embeddedjs/upgrade.js';
const root=new URL('../',import.meta.url),pack=selectedPack(root,process.env.PEBBLE_EPISODE_ID);
const source=JSON.parse(fs.readFileSync(new URL('../../stories/animated/'+pack.id+'.json',import.meta.url)));
const glyphs=fs.readFileSync(new URL('content/glyphs.txt',root),'utf8');
test('selected '+pack.id+': exact source export, graph, installed art and glyphs',()=>{
 assert.deepEqual(pack,exportEpisode(source,pack.id));
 validate(pack,glyphs,n=>!!art[n]||!!art[n+'-full']);
});
test('selected '+pack.id+': all phrase layouts fit the installed font metrics',()=>{
 const metrics=JSON.parse(fs.readFileSync(new URL('content/font-metrics.json',root)));
 const measure=(t,k)=>[...t].reduce((sum,c)=>{assert.notEqual(metrics[k][c],undefined,'Missing measured glyph '+c);return sum+metrics[k][c];},0);
 for(const node of pack.nodes)for(const phrase of [...(node.phrases||[]),...(node.options||[]).flatMap(o=>o.phrases)])for(const mode of [0,1]){
  for(const page of pages(phrase,mode,measure)){
   assert.ok(page.py.length&&page.py.length<=2);assert.ok(page.lower.length&&page.lower.length<=(mode?2:3));
   for(const line of page.py)assert.ok(measure(line,'py')<=184);
   for(const line of page.lower)assert.ok(measure(line,mode?'zh':'en')<=184);
  }
 }
});
// Enumerate actual branches, including route-dependent choices; no Episode 11 bitmask assumptions.
function routes(next,entry){
 const pending=[{i:entry,route:[],text:[],scenes:[],narrator:'Alden'}],out=[];let steps=0;
 while(pending.length){
  const state=pending.pop();
  assert.ok(++steps<=100000,'Route audit exceeds 100000 states; review branching before raising the limit');
  const result=next(state);
  if(result===null)out.push({route:state.route,text:state.text,scenes:state.scenes});else pending.push(...result);
 }
 return out.sort((a,b)=>JSON.stringify(a.route).localeCompare(JSON.stringify(b.route)));
}
test('selected '+pack.id+': every branch preserves source text, choices, rejoins and scene anchors',()=>{
 const script=source.script.split('\n').map(s=>s.trim()),labels=new Map();script.forEach((l,i)=>{const m=l.match(/^label (\S+)$/);if(m)labels.set(m[1],i);});
 const cues=new Map((loadDirection(pack.id)?.cues||[]).map(c=>[c.anchor,c.scene]));
 const original=routes(s=>{
  assert.ok(s.i<script.length,'Source path falls off script');const line=script[s.i];let m;
  if(line==='end')return null;
  if((m=line.match(/^goto (\S+)$/)))return [{...s,i:labels.get(m[1])}];
  if((m=line.match(/^choice (\S+)$/))){
   const options=[];let i=s.i+1;while(script[i]?.startsWith('option ')){const o=script[i++].match(/^option (\S+) "([^"]+)" -> (\S+)$/);assert.ok(o);options.push({...s,i:labels.get(o[3]),route:[...s.route,m[1]+'='+o[1]],text:[...s.text,['choice',o[2]]]});}return options;
  }
  if((m=line.match(/^scene (\S+)$/)))s={...s,narrator:m[1]==='restaurant'?'YoungAlden':'Alden'};
  if((m=line.match(/^label (\S+)$/))&&cues.has(m[1]))s={...s,scenes:[...s.scenes,cues.get(m[1])]};
  if((m=line.match(/^(\w+)(?: \[[^\]]+\])?: (.+)$/)))s={...s,text:[...s.text,[m[1]==='I'?s.narrator:m[1],m[2].normalize('NFC')]]};
  return [{...s,i:s.i+1}];
 },labels.get('opening'));
 const exported=routes(s=>{
  const n=pack.nodes[s.i];assert.ok(n);if(n.type==='end')return null;
  if(n.type==='goto')return [{...s,i:n.to}];
  if(n.type==='choice')return n.options.map(o=>({...s,i:o.to,route:[...s.route,n.id+'='+o.id],text:[...s.text,['choice',o.phrases.map(p=>p.zh).join('')]]}));
  if(n.type==='line')s={...s,text:[...s.text,[n.speaker,n.phrases.map(p=>p.zh).join('')]]};
  if(n.type==='animation')s={...s,scenes:[...s.scenes,n.id]};
  return [{...s,i:s.i+1}];
 },pack.entry);
 assert.ok(original.length);assert.deepEqual(exported,original);
});
test('selected migration descriptors belong to this episode only',()=>{
 for(const [generated,file] of [[legacy,'legacy-v1-anchors.json'],[upgrade,'legacy-v1.1-anchors.json']]){
  const previous=JSON.parse(fs.readFileSync(new URL('content/'+file,root)));
  assert.deepEqual(generated,migrationMap(pack,previous));assert.equal(generated.id,pack.id);
  if(previous.id!==pack.id){assert.equal(generated.version,'');assert.deepEqual(generated.indices,[]);}
 }
});
test('episode IDs reject path traversal and malformed targets before export',()=>{
 for(const id of ['../supportive-11','supportive-11/other','--release','story','supportive-11.json',''])assert.throws(()=>episodeId(id));
 for(const id of ['supportive-10','supportive-12','moonlight-02','story2-12-v2'])assert.equal(episodeId(id),id);
 assert.throws(()=>selectedPack(root,'different-99'),/does not match/);
 const next={...pack,id:'another-99'};assert.deepEqual(migrationMap(next,{id:pack.id,version:pack.version,anchors:[]}).indices,[]);
});
