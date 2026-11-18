import fs from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {analyse} from '../scripts/episode-analysis.mjs';
import {validateDirection,reactionDirection} from '../scripts/story-direction.mjs';
for(const n of [18,19])test(`supportive-${n}: all routes, aligned language, ASCII title, unchanged runtime and reproducible source`,()=>{
 const id=`supportive-${n}`,root=new URL('../../',import.meta.url),source=JSON.parse(fs.readFileSync(new URL(fs.existsSync(new URL(`stories/animated/${id}.json`,root))?`stories/animated/${id}.json`:`pebble/authoring/sources/${id}.json`,root))),plain=fs.readFileSync(new URL(fs.existsSync(new URL(`stories/animated/source/${id}.story`,root))?`stories/animated/source/${id}.story`:`pebble/authoring/sources/${id}.story`,root),'utf8'),direction=JSON.parse(fs.readFileSync(new URL(`pebble/direction/${id}.json`,root)));
 assert.equal(source.script.trim(),plain.trim());assert.ok(validateDirection(source.script,id,direction).size>=5);assert.ok(reactionDirection(source.script,direction).size>=20);
 const a=analyse(id,{source});assert.deepEqual(a.errors,[]);assert.deepEqual(a.warnings,[]);assert.equal(a.presentation.routes,16);assert.ok(a.presentation.animations.min>=5);assert.ok(a.presentation.reactions.min>=20);assert.ok(a.presentation.reactions.max<=25);assert.equal(a.runtime.compatible,true);assert.match(a.pack.title,/^[ -~]+$/);assert.ok(a.wireBytes<=65536&&a.maxRecordBytes<=2048&&a.pack.nodes.length<=160);
 const texts=source.script.split('\n').flatMap(l=>{const d=l.match(/^\w+(?: \[[^\]]+\])?: (.+)$/),o=l.match(/^option \S+ "([^"]+)" ->/);return d?[d[1]]:o?[o[1]]:[];});for(const t of texts){const a=source.chinese.lines[t];assert.ok(a?.pinyin&&a.english&&a.interlinear?.length);assert.equal(a.interlinear.map(c=>c.chinese).join(''),t);assert.ok(a.interlinear.every(c=>c.pinyin&&c.gloss));}
 const compact=JSON.parse(fs.readFileSync(new URL(`pebble/authoring/sources/${id}.json`,root)));assert.deepEqual(analyse(id,{source:compact}).pack,a.pack);
});
