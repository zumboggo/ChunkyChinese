import {readFileSync,writeFileSync,mkdirSync,existsSync,mkdtempSync,rmSync,statSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {resolve,dirname} from 'node:path'
import {spawnSync} from 'node:child_process'
import {CHARACTER_OPTIONS,EMOTIONS,RESTS,RESPONSES,TALKS} from '../src/game/animation/shared/engine/acting-library.js'
import {animationSource} from './lib/episode-dependencies.mjs'
const flags=Object.fromEntries(process.argv.slice(2).map(a=>{const i=a.indexOf('=');return [a.slice(2,i<0?undefined:i),i<0?true:a.slice(i+1)]}))
if(!/^[a-z0-9-]+$/.test(flags.series??''))throw Error('Use --series=jedi --vocab=PRIVATE_JSON [--offline]')
const read=p=>JSON.parse(readFileSync(p,'utf8')),configPath=`.local/authoring/${flags.series}.json`,saved=existsSync(configPath)?read(configPath):{},record=read(`stories/authoring/series/${flags.series}.json`)
const vocab=flags.vocab??saved.vocab
if(typeof vocab!=='string'||!existsSync(vocab))throw Error('Supply an existing --vocab path. No learner export is guessed or modified.')
const words=read(vocab);if(!Array.isArray(words)||words.some(w=>typeof w.word!=='string'||typeof w.known!=='boolean'))throw Error('Vocabulary must contain {word, known} records.')
for(const path of [record.assetsFrom,record.vocabularySupplement,...(record.castBundle?[record.castBundle]:[])])if(!existsSync(path))throw Error('Missing series asset: '+path)
const run=(cmd,args)=>{const r=spawnSync(cmd,args,{encoding:'utf8',timeout:30000});if(r.error||r.status!==0)throw Error(`${cmd} check failed: ${r.error?.message??r.stderr?.slice(-400)}. No publication attempted.`);return r.stdout.trim()}
const dirty=run('git',['status','--porcelain']).split('\n').filter(Boolean)
const dependency=animationSource(process.cwd())
run('node',['scripts/sync-story-animation.mjs','--check'])
const workspace={dirty:dirty.length>0,changedPaths:dirty.length,release:dirty.length?'Commit only this task’s files; game:release publishes the exact commit from an isolated checkout. Never stash or delete another task’s work.':'Clean checkout; recheck before publishing.',animationSource:dependency}
let remote='not checked (offline)'
if(!flags.offline){run('git',['fetch','origin','main']);run('git',['merge-base','--is-ancestor','origin/main','HEAD']);remote=run('git',['rev-parse','origin/main'])}
const voices=process.platform==='darwin'?run('/usr/bin/say',['-v','?']):''
if(process.platform!=='darwin'||!/^Tingting\s/m.test(voices))throw Error('The cached Mandarin workflow requires macOS Tingting. Resolve audio service access before authoring.')
const probe=mkdtempSync(resolve(tmpdir(),'episode-audio-'))
try{
 run('/usr/bin/say',['-v','Tingting','-r','165','-o',resolve(probe,'probe.aiff'),'好。'])
 run('/usr/bin/afconvert',[resolve(probe,'probe.aiff'),resolve(probe,'probe.m4a'),'-f','m4af','-d','aac ','-b','32000'])
 if(statSync(resolve(probe,'probe.m4a')).size<100)throw Error('Audio service produced an empty recording')
}finally{rmSync(probe,{recursive:true,force:true})}
const pythonCandidates=[saved.python,'.local/jedi-tools/bin/python','python3'].filter(Boolean)
let python,ffmpeg
for(const candidate of pythonCandidates){const r=spawnSync(candidate,['-c','import shutil; import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())'],{encoding:'utf8',timeout:5000});if(r.status===0&&existsSync(r.stdout.trim())){python=candidate;ffmpeg=r.stdout.trim();break}}
if(!ffmpeg){const r=spawnSync('which',['ffmpeg'],{encoding:'utf8'});if(r.status===0){ffmpeg=r.stdout.trim();python='python3'}}
if(!ffmpeg)throw Error('No working ffmpeg runtime found. Configure it before creating the teaser.')
run(ffmpeg,['-version'])
const assets=read(record.assetsFrom).assets
const brief={series:record.id,boundary:record.source,latest:record.completed?.at(-1),assetsFrom:record.assetsFrom,cast:Object.keys(assets.characters),backgrounds:Object.keys(assets.backgrounds),workspace,vocabulary:{path:resolve(vocab),reviewedKnown:words.filter(w=>w.known).length,supplement:record.vocabularySupplement,target:record.coverage},runtime:{python,ffmpeg,voice:'Tingting'},supported:{character:CHARACTER_OPTIONS,emotions:EMOTIONS,rests:RESTS,responses:RESPONSES,talks:TALKS},remote,note:'Freeze a passing draft before language assembly. Reuse established assets. Read only needed fields from this brief. Verify exact video pricing before any paid request.'}
mkdirSync(dirname(configPath),{recursive:true});writeFileSync(configPath,JSON.stringify({vocab:resolve(vocab),python,ffmpeg,checkedAt:new Date().toISOString(),remote},null,2)+'\n')
writeFileSync(`.local/authoring/${flags.series}-brief.json`,JSON.stringify(brief,null,2)+'\n')
console.log(JSON.stringify({series:record.id,brief:`.local/authoring/${flags.series}-brief.json`,workspace,remote,runtime:brief.runtime,coverage:record.coverage},null,2))
