import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs'
import {resolve} from 'node:path'
import {randomUUID} from 'node:crypto'
import {spawnSync} from 'node:child_process'
import assert from 'node:assert/strict'
import {auditVocabulary} from './lib/episode-vocabulary.mjs'
import {addEpisodeAudio} from './lib/episode-audio.mjs'
import {stageEpisodeRelease} from './lib/episode-stage.mjs'
import {episodeRoutes,checkRouteExpectations} from './lib/episode-plan.mjs'
import {validateChinese,chineseTexts,exportPackage,importPackage,size} from '../src/game/animation/package.ts'
const flags=Object.fromEntries(process.argv.slice(2).map(a=>{if(!a.startsWith('--'))throw Error('Use --name=value flags');const i=a.indexOf('=');return [a.slice(2,i<0?undefined:i),i<0?true:a.slice(i+1)]}))
const read=p=>JSON.parse(readFileSync(p,'utf8')),write=(p,v)=>writeFileSync(p,JSON.stringify(v,null,2)+'\n')
const id=flags.init??(flags.plan&&read(flags.plan).id)
if(typeof id!=='string'||!/^[a-z0-9-]+$/.test(id))throw Error('Use --init=episode-id --series=moonlight, or --plan=PATH --vocab=PRIVATE_JSON')
const base=resolve('.local/episodes',id);mkdirSync(base,{recursive:true})
if(flags.init){
 const series=flags.series??'moonlight';if(!/^[a-z0-9-]+$/.test(series))throw Error('Invalid series')
 const record=read(`stories/authoring/series/${series}.json`),path=resolve(base,'plan.json')
 if(existsSync(path))throw Error('Plan already exists: '+path)
 write(path,{id,series,title:'',description:'',assetsFrom:record.assetsFrom,script:resolve(base,'episode.story'),annotations:resolve(base,'lines.json'),lexicon:[],sources:[],planning:{sourceBoundary:'',dramaticChange:'',essentialNewWords:[],englishNarrationPurpose:'',choicesAndCallbacks:[]},pinyinReviewed:false,routes:[],catalog:{id:id+'-v1',category:'lms',episode:0}})
 writeFileSync(resolve(base,'episode.story'),'story 2\nlabel opening\nI: 我准备好了。\nend\n');write(resolve(base,'lines.json'),{})
 console.log('Created '+path+'; fill the compact plan, then run --draft first.');process.exit(0)
}
if(!flags.vocab)throw Error('Provide --vocab; private learning data stays under .local/.')
const plan=read(flags.plan)
if(typeof plan.series!=='string'||!/^[a-z0-9-]+$/.test(plan.series))throw Error('Invalid series ID')
const series=read(`stories/authoring/series/${plan.series}.json`)
const run=resolve(base,new Date().toISOString().replaceAll(':','-')+'-'+randomUUID().slice(0,8));mkdirSync(run,{recursive:true})
const report={id,run,started:new Date().toISOString(),phases:[],status:'running'}
async function phase(name,fn){const start=performance.now();try{const value=await fn();report.phases.push({name,seconds:(performance.now()-start)/1000,status:'passed'});return value}catch(e){report.phases.push({name,seconds:(performance.now()-start)/1000,status:'failed',error:String(e)});throw e}finally{write(resolve(run,'report.json'),report)}}
try{
 const assets=read(plan.assetsFrom).assets,script=readFileSync(plan.script,'utf8'),pack={format:2,profile:'chinese',title:plan.title,description:plan.description,script,assets,quiz:[],sources:plan.sources}
 const vocabulary=await phase('vocabulary',()=>auditVocabulary(pack,read(flags.vocab),{lexicon:plan.lexicon??[],supplement:read(series.vocabularySupplement).words,min:series.coverage.min,max:series.coverage.max}))
 write(resolve(run,'vocabulary.json'),vocabulary)
 console.log(`${vocabulary.range.min.toFixed(2)}–${vocabulary.range.max.toFixed(2)}% familiar; Mandarin entry share ${Math.min(...vocabulary.routes.map(r=>r.exposure.mandarinEntryPercent)).toFixed(1)}–${Math.max(...vocabulary.routes.map(r=>r.exposure.mandarinEntryPercent)).toFixed(1)}% (not listening time).`)
 console.log('Unfamiliar: '+vocabulary.unknownFrequency.map(w=>`${w.word} ×${w.maxPerRoute}`).join(', '))
 if(!vocabulary.passes)throw Error('Revise vocabulary before annotations/audio. See '+run)
 if(!flags.draft){
  if(!plan.title?.trim()||!plan.description?.trim()||!plan.sources?.length)throw Error('Complete title, description and source notes.')
  const selected=await phase('routes, source assertions and resume',()=>checkRouteExpectations(episodeRoutes(pack),plan.routes))
  const lines=read(plan.annotations);pack.chinese={lines}
  await phase('annotations',()=>{
   const texts=chineseTexts(pack)
   if(Object.keys(lines).some(t=>!texts.includes(t)))throw Error('Remove stale annotation entries.')
   for(const t of texts)if(!lines[t]?.interlinear?.length||lines[t].interlinear.map(c=>c.chinese).join('')!==t)throw Error('Missing or mismatched interlinear chunks: '+t)
   addEpisodeAudio(pack,{pinyinOnly:true})
   const errors=validateChinese(pack).errors;if(errors.length)throw Error(JSON.stringify(errors))
  })
  const audio=await phase('audio',()=>addEpisodeAudio(pack));report.audio=audio
  await phase('package and ZIP',async()=>{
   const errors=validateChinese(pack).errors;if(errors.length)throw Error(JSON.stringify(errors))
   const zip=await exportPackage(pack);assert.deepEqual(await importPackage(new File([zip],'episode.zip')),pack)
   writeFileSync(resolve(run,'episode.zip'),Buffer.from(await zip.arrayBuffer()));report.bytes=size(pack)
  })
  const packagePath=resolve(run,'episode.json');write(packagePath,pack)
  const fixture=resolve(run,'browser.json');write(fixture,{packagePath,routes:selected})
  if(flags.browser||flags.stage)await phase('phone and desktop',()=>{
   const result=spawnSync(process.execPath,['scripts/test-episode.mjs',`--fixture=${fixture}`],{stdio:'inherit'})
   if(result.status!==0)throw Error('Browser preview failed. See '+run)
  })
  if(flags.stage)await phase('stage new release',()=>{
   stageEpisodeRelease({id,plan,pack})
   console.log('Staged new release. Review and commit intended files, then game:publish -- --push. No network publication performed.')
  })
  console.log('Prepared package: '+packagePath)
 }
 report.status='passed'
}catch(e){report.status='failed';console.error(String(e));process.exitCode=1}
finally{report.finished=new Date().toISOString();write(resolve(run,'report.json'),report);console.log('Private run report: '+resolve(run,'report.json'))}
