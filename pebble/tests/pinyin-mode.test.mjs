import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {exportEpisode,watchPresentation,coverage} from '../scripts/export.mjs';import {validate} from '../reader/src/embeddedjs/transfer.js';import {initial,migrate,restore} from '../reader/src/embeddedjs/reader.js';
const source=JSON.parse(fs.readFileSync(new URL('../../stories/animated/supportive-11.json',import.meta.url))),full=exportEpisode(source),small=watchPresentation(full,false),glyphs=fs.readFileSync(new URL('../content/glyphs.txt',import.meta.url),'utf8');
test('watch-only pinyin export preserves annotations, graph and reviewed English; Chinese can be re-enabled',()=>{
 const before=JSON.stringify(full);assert.equal(small.chinese,false);assert.equal(small.textVersion,full.version);assert.notEqual(small.version,full.version);assert.equal(small.nodes.length,full.nodes.length);
 for(let i=0;i<full.nodes.length;i++){const expected=structuredClone(full.nodes[i]);for(const p of [...(expected.phrases||[]),...(expected.options||[]).flatMap(o=>o.phrases)])delete p.zh;assert.deepEqual(small.nodes[i],expected);}
 assert.equal(JSON.stringify(full),before);assert.deepEqual(watchPresentation(full,true),full);validate(small,glyphs,()=>true);coverage(small,glyphs);
 const invalid=structuredClone(small);delete invalid.chinese;assert.throws(()=>validate(invalid,glyphs,()=>true),/phrase/);
});
test('switching downloaded text presentation preserves phrase and selected route in both directions',()=>{
 const s=initial(full);s.n=full.nodes.findIndex(n=>n.type==='line');s.p=1;s.route=[{id:'choice',option:'b'}];
 const next=migrate(full,small,s);assert.equal(next.n,s.n);assert.equal(next.p,s.p);assert.deepEqual(next.route,s.route);
 const back=migrate(small,full,next);assert.equal(back.n,s.n);assert.equal(back.p,s.p);assert.deepEqual(back.route,s.route);
});

import os from 'node:os';import path from 'node:path';import {execFileSync} from 'node:child_process';
test('Chinese font build configuration can be restored and removed without losing portrait IDs',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'pebble-reading-mode-'));try{
 for(const name of ['scripts/configure-reading.mjs','content/chinese-font.json','reader/package.json']){const target=path.join(tmp,name);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(new URL('../'+name,import.meta.url),target);}
 fs.mkdirSync(path.join(tmp,'reader/src/embeddedjs'),{recursive:true});const load=()=>JSON.parse(fs.readFileSync(path.join(tmp,'reader/package.json'))).pebble.resources.media;
 const before=load().filter(a=>a.type==='raw');
 for(const enabled of [true,false,true,false]){fs.writeFileSync(path.join(tmp,'reading-mode.json'),JSON.stringify({chinese:enabled}));execFileSync(process.execPath,[path.join(tmp,'scripts/configure-reading.mjs')]);assert.equal(load().some(a=>a.name==='FONT_CHINESE_28'),enabled);assert.deepEqual(load().filter(a=>a.type==='raw'),before);}
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});

test('archived bilingual episode position converts on later library selection',()=>{const s=initial(full);s.n=full.nodes.findIndex(n=>n.type==='line');s.p=1;s.e=1;s.route=[{id:'past',option:'b'}];const next=restore(small,s);assert.equal(next.n,s.n);assert.equal(next.p,s.p);assert.equal(next.e,0);assert.deepEqual(next.route,s.route);});
