import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {readLibrary,validateLibrary} from '../scripts/scene-library.mjs';
import {loadDirection} from '../scripts/story-direction.mjs';
import {exportEpisode} from '../scripts/export.mjs';
const source=JSON.parse(fs.readFileSync(new URL('../../stories/animated/supportive-11.json',import.meta.url)));
const pack=JSON.parse(fs.readFileSync(new URL('../content/supportive-11.json',import.meta.url)));
test('generated browser/native artifacts agree with the shared library',()=>{execFileSync(process.execPath,[new URL('../scripts/generate-scenes.mjs',import.meta.url).pathname,'--check']);});
test('anchor migration retains the exact shipped episode and save version',()=>{assert.deepEqual(exportEpisode(source),pack);assert.equal(pack.version,'73281f5e8202','This refactor must retain the shipped Episode 11 save version');});
test('editing anchored prose and inserting an unrelated line preserves scene placement',()=>{
 const d=structuredClone(source),anchor='label watch_train_phone',lines=d.script.split('\n'),i=lines.indexOf(anchor);
 const old=lines[i-1].split(': ').slice(1).join(': '),replacement='测试。';
 d.chinese.lines[replacement]={interlinear:[{chinese:replacement,pinyin:'cè shì.',gloss:'Test.'}]};
 lines[i-1]=lines[i-1].replace(old,replacement);lines.splice(i-1,0,'I: '+replacement);d.script=lines.join('\n');
 const nodes=exportEpisode(d).nodes,index=nodes.findIndex(n=>n.type==='animation');
 assert.equal(nodes[index].id,'train-phone');assert.equal(nodes[index-1].phrases[0].zh,replacement);
 assert.deepEqual(nodes.filter(n=>n.type==='animation').map(n=>n.id),pack.nodes.filter(n=>n.type==='animation').map(n=>n.id));
});
test('missing, duplicate, mismatched and unsupported direction fails loudly',()=>{
 assert.throws(()=>exportEpisode({...source,script:source.script.replace('label watch_train_phone','label removed')}),/anchor/);
 assert.throws(()=>exportEpisode({...source,script:source.script+'\nlabel watch_train_phone'}),/anchor/);
 const d=loadDirection('supportive-11');d.cues[0].scene='not-installed';assert.throws(()=>exportEpisode(source,'supportive-11',d),/Unsupported scene/);
 d.cues[0].scene='train-phone';d.cues.push(d.cues[0]);assert.throws(()=>exportEpisode(source,'supportive-11',d),/Duplicate cue/);
 d.episode='wrong';assert.throws(()=>exportEpisode(source,'supportive-11',d),/Invalid story direction/);
});
test('scene validation rejects ABI changes and malformed choreography',()=>{
 const bad=mutate=>{const d=readLibrary();mutate(d);assert.throws(()=>validateLibrary(d));};
 bad(d=>d.scenes[0].nativeId=2);bad(d=>d.actions['phone-pickup'].keys[1].t=0);bad(d=>d.actions['phone-pickup'].contact=9000);
 bad(d=>d.scenes[1].actors.child.tracks[0].field='bad');bad(d=>d.scenes[1].actors.child.tracks[0].keys[1].t=5000);bad(d=>d.poses.seated.head[0]=NaN);
});
test('authoring script and package retain the same stable labels',()=>{
 const script=fs.readFileSync(new URL('../../stories/animated/source/supportive-11.story',import.meta.url),'utf8');
 const anchors=s=>s.split('\n').filter(l=>l.startsWith('label watch_'));
 assert.deepEqual(anchors(script),anchors(source.script));
});
