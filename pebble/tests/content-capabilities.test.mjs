import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {fileURLToPath} from 'node:url';import {spawnSync} from 'node:child_process';
import {runtimeFiles,hash} from '../scripts/runtime-profile.mjs';import {recipeFromGesture} from '../scripts/downloadable-scene.mjs';
test('content CLI exports a new main-cast recipe without a build and rejects an older actor capability',()=>{
 const root=fileURLToPath(new URL('../',import.meta.url)),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'pebble-content-capability-')),copy=path.join(tmp,'pebble');
 try{
  const omit=new Set(['build','release','verification','.local','node_modules','__pycache__']);fs.cpSync(root,copy,{recursive:true,filter:p=>!path.relative(root,p).split(path.sep).some(x=>omit.has(x))});
  const source=JSON.parse(fs.readFileSync(new URL('../../stories/animated/supportive-11.json',import.meta.url))),zh=Object.keys(source.chinese.lines).find(k=>source.chinese.lines[k].interlinear?.length);
  const fixture={...source,title:'Capability test',script:'story 2\nlabel opening\nHannah: '+zh+'\nlabel watch_new\nend'};fs.mkdirSync(path.join(tmp,'stories/animated'),{recursive:true});fs.writeFileSync(path.join(tmp,'stories/animated/test-999.json'),JSON.stringify(fixture));
  const cast=JSON.parse(fs.readFileSync(path.join(copy,'scenes/ensemble/characters.json'))),recipe=recipeFromGesture(cast,'hannah','think','train','train');fs.writeFileSync(path.join(copy,'direction/test-999.json'),JSON.stringify({schema:1,episode:'test-999',cues:[{anchor:'watch_new',scene:'download-hannah-thinks',recipe}]}));
  const mode='{"chinese":false}\n';fs.writeFileSync(path.join(copy,'reading-mode.json'),mode);
  const profile={schema:1,pinyinOnly:true,recipeSchema:1,recipeActors:['hannah'],sceneIds:[],appVersion:'test',pbwSha256:'no-build-test',files:{...runtimeFiles(),'reading-mode.json':hash(Buffer.from(mode))}};const profilePath=path.join(copy,'authoring/runtime-profile.json');fs.writeFileSync(profilePath,JSON.stringify(profile));
  const run=()=>spawnSync(process.execPath,[path.join(copy,'scripts/episode-author.mjs'),'content','test-999'],{encoding:'utf8'});const success=run();assert.equal(success.status,0,success.stdout+success.stderr);
  const report=JSON.parse(fs.readFileSync(path.join(copy,'.local/content/test-999/report.json')));assert.deepEqual(report.recipeActors,['hannah']);const pack=JSON.parse(fs.readFileSync(path.join(copy,'.local/content/test-999',report.version+'.json')));assert.equal(pack.chinese,false);assert.ok(pack.nodes.some(n=>n.recipe?.startsWith('1,3,')));assert.ok(!fs.existsSync(path.join(copy,'reader/build')));
  profile.recipeActors=['gorgon','boe','jeremy'];fs.writeFileSync(profilePath,JSON.stringify(profile));const rejected=run();assert.notEqual(rejected.status,0);assert.match(rejected.stderr,/Character requires a newer verified watch runtime/);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
