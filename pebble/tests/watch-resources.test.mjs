import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createRequire} from 'node:module';
import {openWire} from '../reader/src/embeddedjs/wire.js';
const require=createRequire(import.meta.url),sharp=require('sharp');
import {selectedPack} from '../scripts/episode-target.mjs';
import lazy from '../reader/src/embeddedjs/episode.js';
const pack=selectedPack(new URL('../',import.meta.url),process.env.PEBBLE_EPISODE_ID);
const pkg=JSON.parse(fs.readFileSync(new URL('../reader/package.json',import.meta.url)));
test('streamed story resource matches all exported nodes',()=>{
 const wire=fs.readFileSync(new URL('../reader/resources/data/story.ndjson',import.meta.url),'ascii');
 const loaded=openWire(wire.length,(o,n)=>wire.slice(o,o+n));
 assert.equal(loaded.version,pack.version);for(let i=0;i<pack.nodes.length;i++){assert.deepEqual(loaded.nodeAt(i),pack.nodes[i]);assert.deepEqual(lazy.nodeAt(i),pack.nodes[i]);}
});
test('bounded portrait runs reproduce every source pixel at Pebble colour precision',async()=>{
 for(const asset of pkg.pebble.resources.media.filter(a=>a.file.startsWith('portraits/'))){
  const bytes=fs.readFileSync(new URL('../reader/resources/'+asset.file,import.meta.url)),name=asset.file.split('/').at(-1).replace('.rle','');
  const decoded=[];let i=0;
  while(i<bytes.length){const repeat=bytes[i++],runs=bytes[i++],row=[];assert.ok(repeat>0&&runs>0);for(let r=0;r<runs;r++){const n=bytes[i++],color=bytes[i++];assert.ok(n>0&&color>=192);row.push(...Array(n).fill(color));}assert.equal(row.length,200);for(let y=0;y<repeat;y++)decoded.push(...row);}
  const sources=name.endsWith('-full')?[0,1,2,3].map(i=>name+'-'+i+'.png'):[name+'.png'];
  const expected=[];for(const file of sources){const {data,info}=await sharp(new URL('../reader/resources/images/'+file,import.meta.url).pathname).removeAlpha().raw().toBuffer({resolveWithObject:true});for(let p=0;p<data.length;p+=info.channels)expected.push(192|(Math.round(data[p]/85)<<4)|(Math.round(data[p+1]/85)<<2)|Math.round(data[p+2]/85));}
  assert.deepEqual(decoded,expected,asset.file);
 }
});
test('generated flash index reads every bundled node correctly',()=>{
 const wire=fs.readFileSync(new URL('../reader/resources/data/story.ndjson',import.meta.url),'ascii');
 const source=fs.readFileSync(new URL('../reader/src/embeddedjs/bundled.js',import.meta.url),'utf8').replace("import io from './native';",'').replace('export default meta;','return meta;');
 const header=fs.readFileSync(new URL('../reader/src/c/story_index.h',import.meta.url),'utf8');const spans=[...header.matchAll(/\{(\d+),(\d+)\}/g)].map(m=>[+m[1],+m[2]]);
 const index=fs.readFileSync(new URL('../reader/resources/data/story-index.bin',import.meta.url));assert.equal(index.length,spans.length*4);spans.forEach((span,i)=>assert.deepEqual([index.readUInt16LE(i*4),index.readUInt16LE(i*4+2)],span));
 let largest=0;const lazy=new Function('io',source)({readStoryNode(i){const [o,n]=spans[i];largest=Math.max(largest,n);assert.ok(n<=2048);return wire.slice(o,o+n);}});
 assert.equal(lazy.version,pack.version);for(let i=0;i<pack.nodes.length;i++)assert.deepEqual(lazy.nodeAt(i),pack.nodes[i]);assert.ok(largest<2048);
});

test('streamed index preserves the exact 64 KiB boundary with 16-bit offsets',()=>{
 const meta=JSON.stringify({format:1,id:'supportive-999',version:'123456789abc',entry:0,nodeCount:40});
 const rows=[meta,...Array.from({length:39},()=>JSON.stringify({type:'line',phrases:[{py:'hello',en:'hello'}]})),JSON.stringify({type:'end'})];
 let left=65536-rows.reduce((n,row)=>n+row.length+1,0);
 for(let i=1;i<rows.length&&left;i++){const n=Math.min(left,2047-rows[i].length);rows[i]+=' '.repeat(n);left-=n;}
 assert.equal(left,0);const wire=rows.join('\n')+'\n';assert.equal(wire.length,65536);
 const loaded=openWire(wire.length,(o,n)=>wire.slice(o,o+n));assert.equal(loaded.nodeAt(39).type,'end');assert.equal(loaded.nodeAt(0).phrases[0].en,'hello');
});
