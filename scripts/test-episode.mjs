import {createServer} from 'node:net'
import {resolve,dirname} from 'node:path'
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs'
import {spawn} from 'node:child_process'
import {randomUUID,createHash} from 'node:crypto'
import {failedTargets} from './lib/episode-retry.mjs'
const fixture=process.argv.find(a=>a.startsWith('--fixture='))?.slice(10)
if(!fixture)throw Error('Use --fixture=PATH produced by game:episode')
const file=resolve(fixture),data=JSON.parse(readFileSync(file,'utf8'));
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const identity={fixtureHash:hash(file),packageHash:hash(data.packagePath)};
const failedFrom=process.argv.find(a=>a.startsWith('--failed-from='))?.slice(14);
let targets=[];
if(failedFrom){
 const previous=JSON.parse(readFileSync(resolve(failedFrom,'run.json'),'utf8'));
 if(previous.fixtureHash!==identity.fixtureHash||previous.packageHash!==identity.packageHash)throw Error('Fixture/package changed; run the full suite.');
 targets=failedTargets(JSON.parse(readFileSync(resolve(failedFrom,'browser-results.json'),'utf8')));
 console.log('Diagnostic retry only; inspect the prior failure first. Final release still requires a full run.');
}
// Reserve a fresh local port. Playwright refuses to reuse another run's server.
const server=createServer();await new Promise((ok,no)=>{server.once('error',no);server.listen(0,'127.0.0.1',ok)})
const port=server.address().port;await new Promise(ok=>server.close(ok))
const output=resolve(dirname(file),'browser-'+randomUUID()),log=[]
mkdirSync(output,{recursive:true});writeFileSync(resolve(output,'run.json'),JSON.stringify({...identity,scope:targets.length?'diagnostic':'full',targets},null,2));console.log('Isolated browser results: '+output)
const child=spawn(process.execPath,['node_modules/@playwright/test/cli.js','test','--config=playwright.episode.config.ts'],{env:{...process.env,EPISODE_FIXTURE:file,EPISODE_RETRY_TARGETS:JSON.stringify(targets),EPISODE_TEST_OUTPUT:output,PLAYWRIGHT_BASE_URL:`http://127.0.0.1:${port}`},stdio:['ignore','pipe','pipe']})
for(const stream of [child.stdout,child.stderr])stream.on('data',b=>{log.push(b);process.stdout.write(b)})
child.on('error',e=>{console.error(e);process.exitCode=1})
child.on('close',code=>{writeFileSync(resolve(output,'browser.log'),Buffer.concat(log));process.exitCode=code??1})
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal))
