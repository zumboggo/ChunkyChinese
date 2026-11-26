import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {exportEpisode,watchPresentation} from '../scripts/export.mjs';
import {loadDirection} from '../scripts/story-direction.mjs';
test('watch title override preserves phone metadata, all passages and choice targets',()=>{
 const source=JSON.parse(fs.readFileSync(new URL('../../stories/animated/supportive-13.json',import.meta.url)));
 const before=structuredClone(source),direction=loadDirection('supportive-13');
 const ordinary=watchPresentation(exportEpisode(source,'supportive-13',direction));
 const titled=watchPresentation(exportEpisode(source,'supportive-13',{...direction,watchTitle:'A Watch Title'}));
 assert.equal(titled.title,'A Watch Title');assert.equal(titled.shortTitle,'A Watch Title');
 assert.deepEqual(titled.nodes,ordinary.nodes);assert.equal(titled.entry,ordinary.entry);assert.notEqual(titled.version,ordinary.version);assert.deepEqual(source,before);
});
