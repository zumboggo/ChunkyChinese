import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {exportEpisode} from '../scripts/export.mjs';
import {loadDirection,reactionDirection} from '../scripts/story-direction.mjs';
const source=JSON.parse(fs.readFileSync(new URL('../../stories/animated/supportive-13.json',import.meta.url))),direction=loadDirection('supportive-13');
test('Episode 13 gives every route six animations and 23 source-directed reaction shots',()=>{
 const p=exportEpisode(source,'supportive-13'),todo=[{i:p.entry,a:0,r:0}],routes=[];
 while(todo.length){let s=todo.pop(),n=p.nodes[s.i];assert.ok(n);
  if(n.type==='end'){routes.push(s);continue;}
  if(n.type==='animation')s.a++;if(n.type==='reaction')s.r++;
  if(n.type==='choice')todo.push(...n.options.map(o=>({...s,i:o.to})));
  else todo.push({...s,i:n.type==='goto'?n.to:s.i+1});
 }
 assert.equal(routes.length,16);for(const r of routes){assert.equal(r.a,6);assert.equal(r.r,23);}
 assert.deepEqual([...new Set(p.nodes.filter(n=>n.type==='reaction').map(n=>n.actor))].sort(),['Alden','Gorgon']);
});
test('Reaction direction rejects missing, repeated and unsupported shots',()=>{
 for(const reactions of [[{anchor:'missing',actor:'Gorgon',emotion:'neutral'}],[direction.reactions[0],direction.reactions[0]],[{...direction.reactions[0],actor:'Boe'}],[{...direction.reactions[0],emotion:'blinking'}]])assert.throws(()=>reactionDirection(source.script,{...direction,reactions}));
});
test('Legacy expression aliases resolve to compact animated resources',()=>{
 const atlases=JSON.parse(fs.readFileSync(new URL('../art/reaction-atlases.json',import.meta.url))).atlases;
 const pkg=JSON.parse(fs.readFileSync(new URL('../reader/package.json',import.meta.url)));
 assert.equal(atlases.length,4);
 const aliases=JSON.parse(fs.readFileSync(new URL('../pixel-reactions/native-aliases.json',import.meta.url)));
 for(const a of atlases)for(const emotion of a.emotions)assert.ok(aliases[a.actor+'-'+emotion+'-full']>=1000);
 assert.ok(pkg.pebble.resources.media.some(r=>r.name==='REACTIONS'));
 assert.ok(!pkg.pebble.resources.media.some(r=>/portraits\/.+-full\.rle$/.test(r.file)));
});

test('compact native lookup matches every packed resource and rejects unknown names',async()=>{
 const art=(await import('../reader/src/embeddedjs/art.js')).default,lookup=(await import('../reader/src/embeddedjs/art-native.js')).default;
 for(const [name,id] of Object.entries(art))assert.equal(lookup(name),id,name);
 for(const name of ['','Alden','Gorgon-neutral','missing','font-latin'])assert.equal(lookup(name),undefined);
});

test('presentation audit counts branch-exclusive visuals per complete route',async()=>{
 const {presentationCounts}=await import('../scripts/presentation-counts.mjs');
 assert.deepEqual(presentationCounts(exportEpisode(source,'supportive-13')),{routes:16,animations:{min:6,max:6},reactions:{min:23,max:23}});
 const p={entry:0,nodes:[{type:'choice',options:[{to:1},{to:3}]},{type:'reaction'},{type:'end'},{type:'animation'},{type:'animation'},{type:'end'}]};
 assert.deepEqual(presentationCounts(p),{routes:2,animations:{min:0,max:2},reactions:{min:0,max:1}});
});

test('compact scene lookup preserves every installed ID, name and group',async()=>{
 const original=await import('../reader/src/embeddedjs/scenes.js'),compact=await import('../reader/src/embeddedjs/scenes-native.js');
 assert.equal(compact.sceneCount,original.sceneNames.length);
 for(const [key,id] of Object.entries(original.sceneIds)){
  assert.equal(compact.sceneId(key),id);assert.equal(compact.sceneName(id),original.sceneNames[id-1]);assert.equal(compact.sceneGroup(id),original.sceneGroups[id-1]);
 }
 for(const key of ['','missing','train','download-test'])assert.equal(compact.sceneId(key),0);
});
