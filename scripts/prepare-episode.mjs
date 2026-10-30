import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs'
import {resolve} from 'node:path'
import {randomUUID} from 'node:crypto'
import {spawnSync} from 'node:child_process'
import assert from 'node:assert/strict'
import {compactContinuity} from '../src/game/animation/continuity.ts'
import {auditVocabulary} from './lib/episode-vocabulary.mjs'
import {generateEpisodeEnglish} from './lib/episode-english-audio.mjs'
import {addEpisodeAudio} from './lib/episode-audio.mjs'
import {stageEpisodeRelease} from './lib/episode-stage.mjs'
import {episodeRoutes,checkRouteExpectations,selectBrowserRoutes} from './lib/episode-plan.mjs'
import {digest,loadAssets,freezeScript,compileAnnotations,stageMedia,stageCast,saveAuthoringRecord} from './lib/episode-assembly.mjs'
import {validateChinese,chineseTexts,exportPackage,importPackage,size} from '../src/game/animation/package.ts'
const flags=Object.fromEntries(process.argv.slice(2).map(a=>{if(!a.startsWith('--'))throw Error('Use --name=value flags');const i=a.indexOf('=');return [a.slice(2,i<0?undefined:i),i<0?true:a.slice(i+1)]}))
if(flags.draft&&(flags.stage||flags.browser))throw Error('Draft/freeze and final browser/stage runs are separate steps.')
const read=p=>JSON.parse(readFileSync(p,'utf8')),write=(p,v)=>writeFileSync(p,JSON.stringify(v,null,2)+'\n')
const id=flags.init??(flags.plan&&read(flags.plan).id)
if(typeof id!=='string'||!/^[a-z0-9-]+$/.test(id))throw Error('Use --init=episode-id --series=moonlight, or --plan=PATH --vocab=PRIVATE_JSON')
const base=resolve('.local/episodes',id);mkdirSync(base,{recursive:true})
if(flags.init){
 const series=flags.series??'moonlight';if(!/^[a-z0-9-]+$/.test(series))throw Error('Invalid series')
 const recordPath=`stories/authoring/series/${series}.json`,candidate=flags.after?read(flags.after):null
 if(candidate&&(candidate.baseHash!==digest(readFileSync(recordPath))||candidate.packageHash!==digest(readFileSync(candidate.packagePath))||candidate.nextRecord.id!==series))throw Error('The previous episode candidate is stale or belongs to another series.')
 const record=candidate?.nextRecord??read(recordPath),path=resolve(base,'plan.json')
 if(existsSync(path))throw Error('Plan already exists: '+path)
 if(record.source?.epub){write(resolve(base,'source-record.json'),record);const source=spawnSync('python3',['scripts/episode-source.py','--series',series,'--record',resolve(base,'source-record.json'),'--output',resolve(base,'source.txt')],{stdio:'inherit'});if(source.status!==0)throw Error('Resolve the pinned source before initializing the episode.')}
 write(path,{id,series,title:'',description:'',assetsFrom:record.assetsFrom,...(record.castBundle?{castFrom:record.castBundle}:{}),script:resolve(base,'episode.story'),annotations:resolve(base,'lines.json'),authoring:resolve(base,'authoring.json'),lexicon:[],sources:[],planning:{sourceBoundary:'',dramaticChange:'',essentialNewWords:[],englishNarrationPurpose:'',choicesAndCallbacks:[],sceneActivities:[]},pinyinReviewed:false,continuation:{end:'',nextStart:'',nextEndBefore:'',note:''},routes:[],review:{lines:[]},catalog:{id:id+'-v1',category:record.defaults?.catalogCategory??'lms',episode:0}})
 write(resolve(base,'authoring.json'),{backgrounds:{},castRecipes:null,lines:[]})
 writeFileSync(resolve(base,'episode.story'),'story 2\nlabel opening\nI: 我准备好了。\nend\n');write(resolve(base,'lines.json'),{})
 console.log('Created '+path+'; fill the compact plan, then run --draft first.');process.exit(0)
}
const plan=read(flags.plan)
const authoringConfig=`.local/authoring/${plan.series}.json`
flags.vocab??=existsSync(authoringConfig)?read(authoringConfig).vocab:undefined
if(!flags.vocab)throw Error('Run game:preflight -- --series=SERIES --vocab=PRIVATE_JSON first, or provide --vocab.')
if(typeof plan.series!=='string'||!/^[a-z0-9-]+$/.test(plan.series))throw Error('Invalid series ID')
const series=read(`stories/authoring/series/${plan.series}.json`)
const run=resolve(base,new Date().toISOString().replaceAll(':','-')+'-'+randomUUID().slice(0,8));mkdirSync(run,{recursive:true})
const report={id,run,started:new Date().toISOString(),phases:[],status:'running'}
async function phase(name,fn){const start=performance.now(),entry={name,started:new Date().toISOString(),status:'running'};report.phases.push(entry);write(resolve(run,'report.json'),report);console.log(`[${entry.started}] ${name}`);try{const value=await fn();entry.status='passed';return value}catch(e){entry.status='failed';entry.error=String(e);throw e}finally{entry.seconds=(performance.now()-start)/1000;entry.finished=new Date().toISOString();write(resolve(run,'report.json'),report)}}
try{
 if(flags.stage&&(existsSync(`stories/animated/${id}.json`)||read('public/stories/animated/catalog.json').some(e=>e.id===plan.catalog?.id)))throw Error('Release already exists; use a new immutable episode ID. No audio or browser work started.')
 const assets=loadAssets(plan)
 const script=readFileSync(plan.script,'utf8'),pack={format:2,profile:'chinese',title:plan.title,description:plan.description,script,assets,quiz:[],sources:plan.sources,...(plan.notice?{notice:plan.notice}:{}),...(plan.continuity?{continuity:compactContinuity(plan.continuity)}:{}),...(plan.outcomeScorecard?{outcomeScorecard:plan.outcomeScorecard}:{})}
 const vocabulary=await phase('vocabulary',()=>auditVocabulary(pack,read(flags.vocab),{lexicon:plan.lexicon??[],supplement:read(series.vocabularySupplement).words,min:series.coverage.min,max:series.coverage.max}))
 write(resolve(run,'vocabulary.json'),vocabulary)
 console.log(`${vocabulary.range.min.toFixed(2)}–${vocabulary.range.max.toFixed(2)}% familiar; Mandarin entry share ${Math.min(...vocabulary.routes.map(r=>r.exposure.mandarinEntryPercent)).toFixed(1)}–${Math.max(...vocabulary.routes.map(r=>r.exposure.mandarinEntryPercent)).toFixed(1)}% (not listening time).`)
 console.log('Unfamiliar: '+vocabulary.unknownFrequency.map(w=>`${w.word} ×${w.maxPerRoute}`).join(', '))
 if(!vocabulary.passes)throw Error('Revise vocabulary before annotations/audio. See '+run)
 if(flags.freeze){if(!flags.draft||!plan.authoring)throw Error('--freeze requires --draft and a plan with authoring.');console.log(JSON.stringify(freezeScript(plan,assets)))}
 if(!flags.draft){
  if(!plan.title?.trim()||!plan.description?.trim()||!plan.sources?.length)throw Error('Complete title, description and source notes.')
  const routes=await phase('routes, source assertions and resume',()=>{const all=episodeRoutes(pack);checkRouteExpectations(all,plan.routes);return all})
  const selected=selectBrowserRoutes(routes,pack,{all:!!flags['all-browser-routes']})
  report.routeCoverage={total:routes.length,browser:selected.length,mode:flags['all-browser-routes']?'exhaustive':'beat and option coverage; stateful stories exhaustive'}
  const lines=plan.authoring?compileAnnotations(plan,assets,{requireReview:true}):read(plan.annotations);pack.chinese={lines}
  if(plan.authoring)plan.pinyinReviewed=true
  if(flags.stage&&plan.pinyinReviewed!==true)throw Error('Complete pinyin review before generating audio or staging.')
  await phase('annotations',()=>{
   const texts=chineseTexts(pack)
   if(Object.keys(lines).some(t=>!texts.includes(t)))throw Error('Remove stale annotation entries.')
   for(const t of texts)if(!lines[t]?.interlinear?.length||lines[t].interlinear.map(c=>c.chinese).join('')!==t)throw Error('Missing or mismatched interlinear chunks: '+t)
   addEpisodeAudio(pack,{pinyinOnly:true})
   const errors=validateChinese(pack).errors;if(errors.length)throw Error(JSON.stringify(errors))
  })
  const audio=await phase('audio',()=>addEpisodeAudio(pack));report.audio=audio
  await phase('English pocket audio',()=>generateEpisodeEnglish([pack],{maxEstimatedCost:5}))
  await phase('package and ZIP',async()=>{
   const errors=validateChinese(pack).errors;if(errors.length)throw Error(JSON.stringify(errors))
   const zip=await exportPackage(pack);assert.deepEqual(await importPackage(new File([zip],'episode.zip')),pack)
   writeFileSync(resolve(run,'episode.zip'),Buffer.from(await zip.arrayBuffer()));report.bytes=size(pack)
  })
  const packagePath=resolve(run,'episode.json');write(packagePath,pack)
  if(flags.stage)stageMedia(plan)
  for(const line of plan.review?.lines??[])if(!routes.some(r=>r.beats.some(b=>b.text===line)))throw Error('Unreachable review line: '+line)
  const fixture=resolve(run,'browser.json');write(fixture,{packagePath,routes:selected,review:plan.review??{lines:[]},catalog:plan.catalog})
  if(flags.browser||flags.stage)await phase('phone and desktop',()=>{
   const result=spawnSync(process.execPath,['scripts/test-episode.mjs',`--fixture=${fixture}`],{stdio:'inherit'})
   if(result.status!==0)throw Error('Browser preview failed. See '+run)
  })
  if(flags.stage)await phase('stage new release',()=>{
   stageEpisodeRelease({id,plan,pack})
   stageCast(plan,assets)
   write(resolve(flags.plan),plan)
   saveAuthoringRecord(plan,report,vocabulary)
   console.log('Staged new release. Review and commit intended files, then game:publish -- --push. No network publication performed.')
  })
  console.log('Prepared package: '+packagePath)
 }
 report.status='passed'
 if(flags.stage){
  // Persist the passing report before the guarded continuation reader consumes it.
  write(resolve(run,'report.json'),report)
  const result=spawnSync('python3',['scripts/prepare-continuation.py','--plan',resolve(flags.plan),'--report',resolve(run,'report.json'),'--output',resolve(base,'continuation.json')],{stdio:'inherit'})
  report.continuation={status:result.status===0?'prepared':'needs correction',path:resolve(base,'continuation.json')}
  if(result.status!==0){process.exitCode=1;console.error('Staging passed. Correct continuation fields and run game:continuation with this passing report; do not restage the immutable package.')}
 }
}catch(e){report.status='failed';report.error=String(e);console.error(String(e));process.exitCode=1}
finally{report.finished=new Date().toISOString();write(resolve(run,'report.json'),report);console.log('Private run report: '+resolve(run,'report.json'))}
