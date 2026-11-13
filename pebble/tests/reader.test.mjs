import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {initial,advance,previous,browse,current,phrase,restore} from '../reader/src/embeddedjs/reader.js';import {pages,wrap} from '../reader/src/embeddedjs/layout.js';import {Transfer,checksum,validate} from '../reader/src/embeddedjs/transfer.js';import {exportEpisode,coverage} from '../scripts/export.mjs';
const pack=JSON.parse(fs.readFileSync(new URL('../content/supportive-11.json',import.meta.url)));const glyphs=fs.readFileSync(new URL('../content/glyphs.txt',import.meta.url),'utf8');
const source=JSON.parse(fs.readFileSync(new URL('../../stories/animated/supportive-11.json',import.meta.url)));
test('source remains faithful and exporter deterministic',()=>{assert.deepEqual(exportEpisode(source),exportEpisode(source));assert.equal(pack.nodes.filter(n=>n.type==='choice').length,4);const exported=pack.nodes.filter(n=>n.type==='line').map(n=>n.phrases.map(p=>p.zh).join(''));const original=source.script.split('\n').filter(l=>/^\w+(?: \[[^\]]+\])?: /.test(l)).map(l=>l.split(': ').slice(1).join(': '));assert.deepEqual(exported,original);coverage(pack,glyphs);validate(pack,glyphs,()=>true);});
for(let mask=0;mask<16;mask++)test('complete offline route '+mask,()=>{let s=initial(pack),decisions=0,steps=0;while(current(pack,s).type!=='end'){const n=current(pack,s);if(n.type==='choice'&&s.p===0&&s.e===0&&s.page===0&&!s.c){s.o=(mask>>decisions)&1;decisions++;}advance(pack,s);s=restore(pack,JSON.parse(JSON.stringify(s)));assert.ok(++steps<1000);}assert.equal(decisions,4);assert.equal(s.route.length,4);assert.deepEqual(s.route.map(r=>r.option),['home','sad','effort','speed'].map((x,i)=>((mask>>i)&1)?['news','public','look','distance'][i]:x));});
test('each encounter, page and route restores; back undoes choice',()=>{const s=initial(pack);while(current(pack,s).type!=='choice')advance(pack,s);const n=s.n;browse(pack,s,1);advance(pack,s,2);assert.equal(s.page,1);advance(pack,s,2);assert.equal(s.c,1);assert.equal(s.e,0);while(current(pack,s).type==='choice')advance(pack,s);assert.equal(s.route.length,1);previous(s);assert.equal(s.n,n);assert.equal(s.route.length,0);assert.equal(s.o,1);assert.equal(s.c,1);assert.equal(restore({...pack,version:'new'},s).n,-1);assert.equal(restore(pack,{...s,p:999}).n,-1);});
test('font includes full tones and rejects novel glyphs',()=>{for(const c of 'āáǎàēéěèīíǐìōóǒòūúǔùüǖǘǚǜ')assert.ok(glyphs.includes(c));const bad=structuredClone(pack);bad.nodes.find(n=>n.phrases).phrases[0].zh+='龘';assert.throws(()=>coverage(bad,glyphs));});
test('wrapping never loses syllables or characters and paginates',()=>{const measure=t=>[...t].length*15;const p={py:'nǐ xiǎng qù nǎlǐ? wǒmen hái kěyǐ zuò de gèng hǎo.',zh:'我们还可以做得更好。',en:'We could still do better, together.'};for(const e of [0,1]){const ps=pages(p,e,measure);assert.ok(ps.length>1);assert.ok(ps.flatMap(x=>x.py).join('').replaceAll(' ','').startsWith(p.py.replaceAll(' ','')));for(const page of ps)for(const line of [...page.py,...page.lower])assert.ok(measure(line)<=184);}assert.equal(wrap(p.zh,measure).join(''),p.zh);});
function harness(){let data='',active=pack;const io={begin(){data='';},write(s,offset){assert.equal(offset,data.length);data+=s;},read(){return data;},activate(p){active=p;}};return {t:new Transfer(io,p=>validate(p,glyphs,()=>true)),active:()=>active,corrupt(){data=data.slice(0,-1)+'x';}};}
const wire=JSON.stringify(pack).replace(/[^\x20-\x7e]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'));
test('atomic transfer, retries, incomplete and corrupt downloads',()=>{const h=harness();h.t.begin(wire.length,checksum(wire),pack.version);assert.equal(h.t.chunk(0,wire.slice(0,600)),600);assert.equal(h.t.chunk(0,wire.slice(0,600)),600);assert.throws(()=>h.t.finish());assert.equal(h.active(),pack);for(let i=600;i<wire.length;i+=600)h.t.chunk(i,wire.slice(i,i+600));h.corrupt();assert.throws(()=>h.t.finish());assert.equal(h.active(),pack);h.t.begin(wire.length,checksum(wire),pack.version);for(let i=0;i<wire.length;i+=600)h.t.chunk(i,wire.slice(i,i+600));assert.deepEqual(h.t.finish(),pack);});
test('reject bad graph, missing art, bad glyph and oversized transfers',()=>{const bad=structuredClone(pack);bad.nodes[0]={type:'goto',to:0};assert.throws(()=>validate(bad,glyphs,()=>true));assert.throws(()=>validate(pack,glyphs,()=>false));assert.throws(()=>harness().t.begin(999999,'abc',pack.version));});

import {openWire} from '../reader/src/embeddedjs/wire.js';
import lazyPack from '../reader/src/embeddedjs/episode.js';
function ndjson(p){const meta={...p,nodeCount:p.nodes.length};delete meta.nodes;return [meta,...p.nodes].map(x=>JSON.stringify(x).replace(/[^\x20-\x7e]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'))).join('\n')+'\n';}
test('lazy bundled and streamed content match every node without loading a whole file',()=>{const wire=ndjson(pack);let largest=0;const read=(o,n)=>{largest=Math.max(largest,n);return wire.slice(o,o+n);};const streamed=openWire(wire.length,read,{total:wire.length,hash:checksum(wire),version:pack.version});validate(streamed,glyphs,()=>true);assert.equal(streamed.nodeCount,pack.nodes.length);for(let i=0;i<pack.nodes.length;i++){assert.deepEqual(streamed.nodeAt(i),pack.nodes[i]);assert.deepEqual(lazyPack.nodeAt(i),pack.nodes[i]);}assert.ok(largest<5000);assert.throws(()=>openWire(wire.length,read,{total:wire.length,hash:'bad',version:pack.version}));});
test('all 16 routes also complete through the downloaded file adapter',()=>{const wire=ndjson(pack),streamed=openWire(wire.length,(o,n)=>wire.slice(o,o+n));for(let mask=0;mask<16;mask++){let s=initial(streamed),choice=0,steps=0;while(current(streamed,s).type!=='end'){if(current(streamed,s).type==='choice'&&s.p===0&&s.e===0&&!s.c)s.o=(mask>>choice++)&1;advance(streamed,s);assert.ok(++steps<1000);}assert.equal(choice,4);assert.ok(s.history.length<=64);}});

const metrics=JSON.parse(fs.readFileSync(new URL('../content/font-metrics.json',import.meta.url)));
test('every real phrase fits using FreeType font advances at the shipped sizes',()=>{
 const measure=(t,k)=>[...t].reduce((s,c)=>{assert.notEqual(metrics[k][c],undefined,'missing '+k+' '+c);return s+metrics[k][c];},0);
 for(const n of pack.nodes)for(const p of [...(n.phrases||[]),...(n.options||[]).flatMap(o=>o.phrases)])for(const e of [0,1]){
  const ps=pages(p,e,measure);for(const page of ps){assert.ok(page.py.length<=2);assert.ok(page.lower.length<=(e?2:3));for(const l of page.py)assert.ok(measure(l,'py')<=184);for(const l of page.lower)assert.ok(measure(l,e?'zh':'en')<=184);}
  assert.ok(ps.flatMap(p=>p.py).join('').replace(/\s/g,'').startsWith(p.py.replace(/\s/g,'')));assert.ok(ps.flatMap(p=>p.lower).join('').replace(/\s/g,'').startsWith((e?p.zh:p.en).replace(/\s/g,'')));for(const page of ps){assert.ok(page.py.length);assert.ok(page.lower.length);}
 }
});

test('all branch responses and canonical rejoins match the original Story 2 paths',()=>{
 const script=source.script.split('\n').map(s=>s.trim()),labels=new Map();script.forEach((s,i)=>{const m=s.match(/^label (\S+)/);if(m)labels.set(m[1],i);});
 for(let mask=0;mask<16;mask++){
  let i=labels.get('opening'),decision=0,original=[];
  for(let steps=0;steps<1000;steps++,i++){
   const line=script[i];if(line==='end')break;
   if(line.startsWith('choice ')){const options=[];while(script[i+1]?.startsWith('option '))options.push(script[++i].match(/^option (\S+) "([^"]+)" -> (\S+)/));const selected=options[(mask>>decision++)&1];i=labels.get(selected[3]);continue;}
   const jump=line.match(/^goto (\S+)/);if(jump){i=labels.get(jump[1]);continue;}
   const speech=line.match(/^\w+(?: \[[^\]]+\])?: (.+)$/);if(speech)original.push(speech[1]);
  }
  const state=initial(pack),exported=[];let choices=0,last=-1;
  while(current(pack,state).type!=='end'){const n=current(pack,state);if(state.n!==last){last=state.n;if(n.type==='line')exported.push(n.phrases.map(p=>p.zh).join(''));if(n.type==='choice')state.o=(mask>>choices++)&1;}advance(pack,state);}
  assert.equal(decision,4);assert.deepEqual(exported,original,'route '+mask);
 }
});

test('Chinese closing punctuation is not stranded on its own line',()=>{assert.deepEqual(wrap('想想以前的家。',t=>[...t].length*28),['想想以前的','家。']);});

import {toggleChinese,migrate,migrateLegacy} from '../reader/src/embeddedjs/reader.js';
import legacy from '../reader/src/embeddedjs/legacy.js';
test('one-pass reading skips the automatic character encounter; Down toggles on demand',()=>{
 const s=initial(pack);while(current(pack,s).type!=='line')advance(pack,s);const n=s.n,p=s.p;
 toggleChinese(s);assert.equal(s.e,1);toggleChinese(s);assert.equal(s.e,0);advance(pack,s);assert.equal(s.e,0);assert.ok(s.n!==n||s.p!==p);
});
test('choosing requires an explicit second Select, not a Chinese encounter',()=>{
 const s=initial(pack);while(current(pack,s).type!=='choice')advance(pack,s);const n=s.n;advance(pack,s);assert.equal(s.n,n);assert.equal(s.c,1);assert.equal(s.e,0);assert.equal(s.route.length,0);advance(pack,s);assert.equal(s.route.length,1);previous(s);assert.equal(s.n,n);assert.equal(s.c,1);
});
test('portrait-only content updates preserve phrase and choice route',()=>{
 const s=initial(pack);while(current(pack,s).type!=='line')advance(pack,s);advance(pack,s);const oldPhrase=phrase(pack,s).zh;
 const next=structuredClone(pack);next.version='abcdef012345';next.nodes.push({type:'end'});const migrated=migrate(pack,next,s);assert.equal(phrase(next,migrated).zh,oldPhrase);assert.deepEqual(migrated.route,s.route);assert.equal(migrated.e,0);
});
test('legacy upgrade maps all original node indices and keeps phrase and choices',()=>{
 assert.equal(legacy.indices.length,71);assert.ok(legacy.indices.every(i=>i>=0));
 const oldIndex=legacy.indices.findIndex(i=>pack.nodes[i].type==='line');const s={...initial(pack),version:legacy.version,n:oldIndex,p:1,e:1,route:[{id:'city',option:'home'}]};
 const upgraded=migrateLegacy(pack,s,legacy);assert.equal(upgraded.n,legacy.indices[oldIndex]);assert.equal(upgraded.p,1);assert.equal(upgraded.e,0);assert.deepEqual(upgraded.route,s.route);
});
test('full-screen assets cover every cue; portrait beats doubled',()=>{
 assert.equal(pack.nodes.filter(n=>n.type==='reaction').length,24);
 for(const n of pack.nodes.filter(n=>n.type==='reaction'))for(let tile=0;tile<4;tile++)assert.ok(fs.existsSync(new URL('../reader/resources/images/'+n.actor+'-'+n.emotion+'-full-'+tile+'.png',import.meta.url)));
});
