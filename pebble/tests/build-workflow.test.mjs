import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
// Exercise the actual shell/export/test pipeline in a disposable checkout, never
// changing the developer's selected episode. Child suites skip this wrapper and the already-run native compiler check.
test('build --check selects different episodes and rejects invalid targets without replacing the bundle',
 {skip:process.env.PEBBLE_WORKFLOW_CHILD==='1',timeout:30000},()=>{
 const root=fileURLToPath(new URL('../',import.meta.url)),app=path.dirname(root.replace(/\/$/,''));
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'pebble-target-test-')),copy=path.join(temp,'pebble');
 try{
  const excluded=new Set(['node_modules','build','release','.local','verification','__pycache__']);
  fs.cpSync(root,copy,{recursive:true,filter:p=>!path.relative(root,p).split(path.sep).some(x=>excluded.has(x))});
  fs.symlinkSync(path.join(root,'node_modules'),path.join(copy,'node_modules'),'dir');
  for(const name of ['supportive-10.json','supportive-11.json','source/supportive-11.story','supportive-13.json','source/supportive-13.story']){
   const target=path.join(temp,'stories/animated',name);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(app,'stories/animated',name),target);
  }
  const env={...process.env,PEBBLE_WORKFLOW_CHILD:'1'};delete env.NODE_TEST_CONTEXT;
  const run=args=>spawnSync('sh',['scripts/build.sh',...args],{cwd:copy,env,encoding:'utf8',timeout:10000});
  const bundle=()=>fs.readFileSync(path.join(copy,'reader/src/pkjs/bundled.json'),'utf8');
  for(const id of ['supportive-10','supportive-11']){
   const result=run(['--check',id]);assert.equal(result.status,0,result.stdout+'\n'+result.stderr);
   assert.equal(JSON.parse(bundle()).id,id);
   assert.equal(JSON.parse(bundle()).nodes.length,id==='supportive-10'?56:88);
  }
  const unsupported=JSON.parse(fs.readFileSync(path.join(temp,'stories/animated/supportive-10.json')));
  unsupported.script=unsupported.script.replace(/^I:/m,'UninstalledActor:');
  fs.writeFileSync(path.join(temp,'stories/animated/unsupported-99.json'),JSON.stringify(unsupported));
  const saved=bundle();
  for(const args of [['--check','../supportive-11'],['--check','missing-99'],['--check','unsupported-99'],['--check','supportive-10','extra']]){
   const result=run(args);assert.notEqual(result.status,0);assert.equal(bundle(),saved);
  }
  const fallback=run(['--check']);assert.equal(fallback.status,0,fallback.stdout+'\n'+fallback.stderr);assert.equal(JSON.parse(bundle()).id,'supportive-11');
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
