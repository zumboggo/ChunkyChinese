import {describe,it,expect,vi} from 'vitest'
import {readFileSync,writeFileSync,mkdtempSync,rmSync,mkdirSync} from 'node:fs'
import {resolve} from 'node:path'
import {spawnSync} from 'node:child_process'
import {providerJson,savedPrediction} from './episode-provider.mjs'
import {episodeRoutes,selectBrowserRoutes,checkRouteExpectations} from './episode-plan.mjs'
import {freezeScript,compileAnnotations,loadAssets,writeJson} from './episode-assembly.mjs'

it.each(['draft','stage'])('rejects an unstaged phone speaker before vocabulary, audio or media in --%s',mode=>{
 mkdirSync('.local/episodes',{recursive:true});const base=mkdtempSync(resolve('.local/episodes/staging-test-')),id=base.split('/').at(-1).toLowerCase()
 try{
  writeFileSync(base+'/episode.story','story 2\nscene restaurant\nshow Hannah worried center\nAlden: 你好。\nend\n')
  writeJson(base+'/vocab.json',[])
  writeJson(base+'/plan.json',{id,series:'super-supportive',script:base+'/episode.story',assetsFrom:'stories/animated/supportive-07.json',catalog:{id:id+'-v1'}})
  const result=spawnSync(process.execPath,['scripts/prepare-episode.mjs',`--plan=${base}/plan.json`,`--vocab=${base}/vocab.json`,`--${mode}`],{encoding:'utf8'})
  expect(result.status).toBe(1);expect(result.stderr).toContain('Speaker Alden is not staged')
  expect(result.stdout).toContain('routes, speaker staging and resume')
  expect(result.stdout).not.toMatch(/\] (vocabulary|audio|English pocket audio|phone and desktop)/)
 }finally{rmSync(base,{recursive:true,force:true});rmSync(resolve('.local/episodes',id),{recursive:true,force:true})}
})

describe('safe audio recovery',()=>{
 it('retries an explicit 429, retaining rejection state until the next attempt',async()=>{
  const fetcher=vi.fn().mockResolvedValueOnce(new Response('',{status:429,headers:{'Retry-After':'2'}})).mockResolvedValueOnce(Response.json({id:'accepted'})),wait=vi.fn(),events=[]
  expect(await providerJson('https://example.test',{method:'POST'},{fetcher,wait,onAttempt:async()=>events.push('uncertain'),onRejected:async()=>events.push('rejected')})).toEqual({id:'accepted'})
  expect(events).toEqual(['uncertain','rejected','uncertain']);expect(wait).toHaveBeenCalledWith(2000)
 })
 it.each([503,504])('never retries an ambiguous paid POST (%s)',async status=>{
  const fetcher=vi.fn().mockResolvedValue(new Response('',{status}))
  await expect(providerJson('https://example.test',{method:'POST'},{fetcher,wait:vi.fn()})).rejects.toThrow('uncertain');expect(fetcher).toHaveBeenCalledTimes(1)
 })
 it('resumes an accepted prediction without submitting again',async()=>{
  const submit=vi.fn(),write=vi.fn(),poll=vi.fn().mockResolvedValue({status:'succeeded',urls:{get:'saved'},output:'audio'})
  await savedPrediction({read:async()=>({status:'processing',urls:{get:'saved'}}),write,submit,poll,wait:async()=>{}})
  expect(submit).not.toHaveBeenCalled();expect(poll).toHaveBeenCalledWith('saved')
 })
 it('does not resubmit after a timeout or unknown receipt',async()=>{
  const submit=vi.fn()
  await expect(savedPrediction({read:async()=>({status:'submission-uncertain'}),write:vi.fn(),submit})).rejects.toThrow('Uncertain')
  expect(submit).not.toHaveBeenCalled()
 })
 it('stops rather than violate a long Retry-After',async()=>{
  const fetcher=vi.fn().mockResolvedValue(new Response('',{status:429,headers:{'Retry-After':'120'}}))
  await expect(providerJson('https://example.test',{method:'POST'},{fetcher,wait:vi.fn()})).rejects.toThrow('60 seconds');expect(fetcher).toHaveBeenCalledTimes(1)
 })
})

describe('browser coverage',()=>{
 it.each([4,5])('covers every beat and option of supportive-%s with two browser routes',n=>{
  const pack=JSON.parse(readFileSync(`stories/animated/supportive-0${n}.json`)),routes=episodeRoutes(pack),selected=selectBrowserRoutes(routes,pack)
  expect(routes).toHaveLength(16);expect(selected).toHaveLength(2)
  const keys=rs=>new Set(rs.flatMap(r=>r.beats.map(b=>JSON.stringify([b.type,b.id,b.option,b.text]))))
  expect(keys(selected)).toEqual(keys(routes))
  const plan=JSON.parse(readFileSync(`stories/authoring/supportive-0${n}.json`));expect(checkRouteExpectations(routes,plan.routes)).toHaveLength(16)
  expect(selectBrowserRoutes(routes,{...pack,continuity:{}})).toHaveLength(16)
  expect(selectBrowserRoutes(routes,pack,{all:true})).toHaveLength(16)
 })
})

describe('frozen, reviewed authoring assembly',()=>{
 it('saves editable pinyin proposals without approving them or replacing corrections',()=>{
  mkdirSync('.local',{recursive:true});const base=mkdtempSync(resolve('.local/pinyin-test-'))
  try{
   const plan={script:base+'/episode.story',authoring:base+'/authoring.json',annotations:base+'/lines.json'}
   const assets={characters:{},backgrounds:{}}
   writeFileSync(plan.script,'story 2\nI: 我只听着。\nend\n');writeJson(plan.authoring,{lines:[]});freezeScript(plan,assets)
   writeJson(plan.authoring,{lines:[{chinese:'我只听着。',english:'I only listen.',pinyin:'',chunks:[{chinese:'我只',gloss:'I only',pinyin:'wǒ zhǐ'},{chinese:'听着。',gloss:'listen'}]}]})
   compileAnnotations(plan,assets)
   const author=JSON.parse(readFileSync(plan.authoring)),row=author.lines[0]
   expect(row.pinyin).toBeTruthy();expect(row.chunks[1].pinyin).toBeTruthy();expect(row.chunks[0].pinyin).toBe('wǒ zhǐ')
   expect(()=>compileAnnotations(plan,assets,{requireReview:true})).toThrow('review')
   row.pinyin='wǒ zhǐ tīng zhe';writeJson(plan.authoring,author)
   compileAnnotations(plan,assets,{reviewed:true});compileAnnotations(plan,assets,{requireReview:true})
   expect(JSON.parse(readFileSync(plan.authoring)).lines[0].pinyin).toBe('wǒ zhǐ tīng zhe')
   row.chunks[1].pinyin='changed';writeJson(plan.authoring,author)
   expect(()=>compileAnnotations(plan,assets,{requireReview:true})).toThrow('review')
  }finally{rmSync(base,{recursive:true,force:true})}
 })
 it('rejects stale script or changed reviewed language and preserves explicit pinyin',()=>{
  mkdirSync('.local',{recursive:true});const base=mkdtempSync(resolve('.local/assembly-test-'))
  try{
   const plan={script:base+'/episode.story',authoring:base+'/authoring.json',annotations:base+'/lines.json',assetsFrom:base+'/assets.json'}
   writeFileSync(plan.script,'story 2\nlabel opening\nI: 我来了。\nend\n');writeJson(plan.assetsFrom,{assets:{characters:{},backgrounds:{}}})
   writeJson(plan.authoring,{lines:[],backgrounds:{}});const assets=loadAssets(plan);expect(freezeScript(plan,assets).entries).toBe(1)
   const author=JSON.parse(readFileSync(plan.authoring));author.lines[0]={chinese:'我来了。',english:'I am here.',pinyin:'wǒ lái le',chunks:[{chinese:'我来了。',gloss:'I am here.',pinyin:'wǒ lái le'}]};writeJson(plan.authoring,author)
   expect(()=>compileAnnotations(plan,assets,{requireReview:true})).toThrow('review')
   compileAnnotations(plan,assets,{reviewed:true});expect(compileAnnotations(plan,assets,{requireReview:true})['我来了。'].pinyin).toBe('wǒ lái le')
   author.lines[0].english='Changed.';writeJson(plan.authoring,author);expect(()=>compileAnnotations(plan,assets,{requireReview:true})).toThrow('review')
   writeFileSync(plan.script,'story 2\nI: 你来了。\nend\n');expect(()=>compileAnnotations(plan,assets)).toThrow('changed after freeze')
  }finally{rmSync(base,{recursive:true,force:true})}
 })
})

it('keeps variable-changing options exhaustive even without conditional text',()=>{
 const pack=JSON.parse(readFileSync('stories/animated/supportive-04.json')),routes=episodeRoutes(pack)
 expect(selectBrowserRoutes(routes,{...pack,script:'story 2\nvariable trust = 0 range 0 10 visible\n'+pack.script.slice(8)})).toHaveLength(16)
})

it('resolves pinned dependencies from the primary checkout when a worktree has no sibling project',async()=>{
 const {execFileSync}=await import('node:child_process'),{animationSource}=await import('./episode-dependencies.mjs')
 mkdirSync('.local',{recursive:true});const base=mkdtempSync(resolve('.local/dependency-test-')),primary=base+'/ChunkyChinese/app',upstream=base+'/Learning is Fun/implementation',worktree=base+'/isolated/app'
 const git=(cwd,...args)=>execFileSync('git',args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim()
 try{
  mkdirSync(upstream+'/functions/learning-content/src',{recursive:true});git(upstream,'init','-q');writeFileSync(upstream+'/functions/learning-content/src/story-engine.js','// pinned engine')
  git(upstream,'add','.');git(upstream,'-c','user.name=Test','-c','user.email=test@example.com','commit','-qm','source');const commit=git(upstream,'rev-parse','HEAD')
  mkdirSync(primary+'/src/game/animation/shared',{recursive:true});git(primary,'init','-q');writeJson(primary+'/src/game/animation/shared/manifest.json',{commit})
  git(primary,'add','.');git(primary,'-c','user.name=Test','-c','user.email=test@example.com','commit','-qm','manifest')
  mkdirSync(base+'/isolated',{recursive:true});git(primary,'worktree','add','--detach',worktree,'HEAD')
  expect(animationSource(worktree)).toBe(upstream)
 }finally{rmSync(base,{recursive:true,force:true})}
})
