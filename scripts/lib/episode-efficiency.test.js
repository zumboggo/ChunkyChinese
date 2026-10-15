import {it,expect} from 'vitest';
import {vocabularyBrief} from './episode-brief.mjs';
import {failedTargets} from './episode-retry.mjs';
it('prepares only requested terms without inflating familiarity or mutating the export',()=>{
 const words=[{word:'体力',known:false},{word:'身体',known:true}],copy=structuredClone(words);
 expect(vocabularyBrief(words,['力气','身体'],[{word:'体力',alternatives:['身体','力气','健康']}])).toEqual([{word:'体力',status:'unfamiliar',alternatives:[{word:'身体',status:'reviewed-known'},{word:'力气',status:'assumed-familiar'},{word:'健康',status:'unfamiliar'}]}]);
 expect(words).toEqual(copy);expect(()=>vocabularyBrief(words,[],Array(81).fill({word:'我'}))).toThrow();
});
it('retries only final failures, preserving project/title identity',()=>{
 const test=(projectName,statuses)=>({projectName,results:statuses.map(status=>({status}))});
 const r={suites:[{suites:[{specs:[{title:'route 1',tests:[test('desktop',['timedOut']),test('phone',['passed'])]},{title:'route 2',tests:[test('desktop',['failed','passed']),test('phone',['skipped'])]}]}]}]};
 expect(failedTargets(r)).toEqual([{title:'route 1',project:'desktop'}]);expect(()=>failedTargets({suites:[]})).toThrow('No failed');
});

it('refuses a diagnostic retry when the package has changed',async()=>{
 const {mkdtempSync,writeFileSync,rmSync}=await import('node:fs');const {tmpdir}=await import('node:os');const {join}=await import('node:path');const {spawnSync}=await import('node:child_process');
 const dir=mkdtempSync(join(tmpdir(),'episode-retry-'));
 try{
  const packagePath=join(dir,'episode.json'),fixture=join(dir,'fixture.json');writeFileSync(packagePath,'{}');writeFileSync(fixture,JSON.stringify({packagePath,routes:[]}));writeFileSync(join(dir,'run.json'),JSON.stringify({fixtureHash:'stale',packageHash:'stale'}));
  const run=spawnSync(process.execPath,['scripts/test-episode.mjs',`--fixture=${fixture}`,`--failed-from=${dir}`],{encoding:'utf8'});
  expect(run.status).not.toBe(0);expect(run.stderr).toContain('Fixture/package changed; run the full suite.');
 }finally{rmSync(dir,{recursive:true,force:true})}
});
