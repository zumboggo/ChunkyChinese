import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {exportEpisode,watchPresentation} from '../scripts/export.mjs';
import {analyse,summary} from '../scripts/episode-analysis.mjs';
import {compatibility} from '../scripts/runtime-profile.mjs';
const source=JSON.parse(fs.readFileSync(new URL('../../stories/animated/supportive-11.json',import.meta.url)));
test('episode review uses the exact export and stable source-order cue context',()=>{
 const r=analyse('supportive-11');assert.deepEqual(r.errors,[]);assert.equal(r.pack.version,watchPresentation(exportEpisode(source,'supportive-11')).version);assert.equal(r.shots.length,5);
 assert.equal(r.shots[0].anchor,'watch_train_phone');assert.match(r.shots[0].passage,/系统关掉/);assert.ok(r.reviewPlaybackSeconds<r.fullLibraryPlaybackSeconds);
 assert.ok(r.wireBytes<65536);assert.ok(r.maxRecordBytes<2048);assert.equal(summary(r).pack,undefined);
});
test('runtime compatibility detects changed, added and removed files',()=>{
 const p={files:{'engine.c':'a','font.ttf':'b'}};assert.equal(compatibility(p,{...p.files}).compatible,true);
 for(const files of [{'engine.c':'changed','font.ttf':'b'},{'engine.c':'a'},{...p.files,'new.c':'c'}])assert.equal(compatibility(p,files).compatible,false);
 assert.equal(compatibility(null,{}).compatible,false);
});
test('preflight reports missing glyphs and portraits before creation',()=>{
 const fixture={...source,script:'story 2\nlabel opening\nscene train\nUninstalledActor: 龘\nend',chinese:{lines:{'龘':{interlinear:[{chinese:'龘',pinyin:'dá',gloss:'Dragon'}]}}}};
 const r=analyse('fixture-99',{source:fixture,direction:null,chinese:true});assert.ok(r.missingArt.includes('UninstalledActor-thoughtful'));assert.ok(r.missingGlyphs.includes('龘'));assert.ok(r.errors.length>=2);
});
test('invalid direction remains a blocker in the review path',()=>{
 const r=analyse('supportive-11',{source,direction:{schema:1,episode:'supportive-11',cues:[{anchor:'missing',scene:'train-phone'}]}});assert.match(r.errors.join(' '),/anchor/);
});
