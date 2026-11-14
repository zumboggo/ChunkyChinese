import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {reactionGroups,reactionActor,reactionName,reactionIds} from '../reader/src/embeddedjs/reactions.js';
import art from '../reader/src/embeddedjs/art.js';
import {generateVisualNovel,resolveEmotion} from '../scripts/generate-visual-novel.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url)));
test('every installed expression resolves by actor and name, retaining old IDs',()=>{
 const cat=read('pixel-reactions/native-catalogue.json');assert.equal(cat.length,53);
 for(const e of cat){assert.equal(reactionActor(e.id-1000),e.actor);assert.equal(reactionName(e.id-1000),e.emotion);assert.ok(reactionIds(e.actor+' reactions').includes(e.id));assert.equal(art[e.actor+'-'+e.emotion+'-full'],e.id);}
 assert.deepEqual(reactionGroups.map(g=>reactionIds(g).length),[9,9,9,9,9,8]);
 assert.equal(art['Alden-determined-full'],1002);assert.equal(art['Alden-sad-full'],1005);
});
test('named scene emotions and legacy numeric cues resolve through generated metadata',()=>{
 for(const [who,names] of Object.entries({alden:['exhausted','holding-back-sadness','quietly-determined'],hannah:['sheepish','strained-smile','reassuring'],boe:['deadpan-disbelief','uncomfortable-concern','grudging-approval'],jeremy:['sleepy','awkward-concern','sincere-encouragement'],gorgon:['weary-patience','restrained-disapproval','reluctant-softening'],'young-alden':['tearful','frightened','small-brave-resolve']})){
  names.forEach((name,i)=>assert.equal(resolveEmotion(who,name),i+6));for(let i=0;i<6;i++)assert.equal(resolveEmotion(who,i),i);
 }
 assert.throws(()=>resolveEmotion('gorgon','sleepy'));assert.throws(()=>resolveEmotion('missing','exhausted'));
});
test('installed hand performances leave schema-1 props and old scene IDs intact',()=>{
 const d=generateVisualNovel(true),lib=read('scenes/library.json');assert.equal(lib.scenes.length,42);
 for(const s of lib.scenes.slice(30,40)){const b=d.bindings[s.id],a=d.actions[b.action];assert.notEqual(b.actor,'gorgon');assert.equal(a.prop,0);assert.ok([1,2].includes(a.hands));assert.equal(a.keys.at(-1)[1],100);}
 const sip=d.actions['interrupted-sip'];assert.equal(sip.prop,3);assert.equal(sip.hands,0);assert.ok(sip.keys.every(k=>k[2]-24>=147),'cup rim must stay below mouth');assert.equal(sip.keys.at(-1)[2],223);
});
