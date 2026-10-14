import {createServer} from 'node:net'
import {resolve,dirname} from 'node:path'
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs'
import {spawn} from 'node:child_process'
import {randomUUID} from 'node:crypto'
const fixture=process.argv.find(a=>a.startsWith('--fixture='))?.slice(10)
if(!fixture)throw Error('Use --fixture=PATH produced by game:episode')
const file=resolve(fixture);JSON.parse(readFileSync(file,'utf8'))
// Reserve a fresh local port. Playwright refuses to reuse another run's server.
const server=createServer();await new Promise((ok,no)=>{server.once('error',no);server.listen(0,'127.0.0.1',ok)})
const port=server.address().port;await new Promise(ok=>server.close(ok))
const output=resolve(dirname(file),'browser-'+randomUUID()),log=[]
mkdirSync(output,{recursive:true});console.log('Isolated browser results: '+output)
const child=spawn(process.execPath,['node_modules/@playwright/test/cli.js','test','--config=playwright.episode.config.ts'],{env:{...process.env,EPISODE_FIXTURE:file,EPISODE_TEST_OUTPUT:output,PLAYWRIGHT_BASE_URL:`http://127.0.0.1:${port}`},stdio:['ignore','pipe','pipe']})
for(const stream of [child.stdout,child.stderr])stream.on('data',b=>{log.push(b);process.stdout.write(b)})
child.on('error',e=>{console.error(e);process.exitCode=1})
child.on('close',code=>{writeFileSync(resolve(output,'browser.log'),Buffer.concat(log));process.exitCode=code??1})
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal))
