import { readFile, writeFile, mkdir, stat } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { pinyin } from 'pinyin-pro'
const root = fileURLToPath(new URL('../', import.meta.url))
process.chdir(root)
const check = process.argv.includes('--check')
const audioOnly = process.argv.includes('--audio')
const episodes = JSON.parse(await readFile('stories/chengdu/episodes.json', 'utf8'))
const hash = value => createHash('sha256').update(value).digest('hex')
const run = (bin,args) => {const r=spawnSync(bin,args,{encoding:'utf8'});if(r.status!==0)throw new Error(`${bin}: ${r.error?.message??r.stderr}`);return r.stdout}
const audio = new Map()
function clip(text) { const name=`audio/${hash(`Tingting:165:v1:${text}`).slice(0,20)}.m4a`;audio.set(name,text);return name }
for(const ep of episodes) {
  if(ep.newWords.length>3 || ep.scenes.length!==4)throw new Error(`Bad lesson size: ${ep.id}`)
  if(ep.scenes.filter(s=>s.promptMode==='listen'&&s.kind==='choice').length!==1)throw new Error('Expected one listening-only exchange')
  for(const s of ep.scenes) {
    if(!s.paragraphs.length||!s.choices.length)throw new Error('Empty scene')
    s.line.pinyin=pinyin(s.line.zh);s.line.audio=clip(s.line.zh)
    if(s.kind !== (ep.scenes.indexOf(s) === 3 ? 'build' : 'choice'))throw new Error('Expected three choices then a builder')
    if(s.kind === 'choice' && (s.options?.length!==3 || s.options.filter(o=>o.correct).length!==1))throw new Error('Exactly one of three replies must be correct')
    for(const option of s.options??[])for(const variant of ['simple','rich']){option[`${variant}Pinyin`]=pinyin(option[variant]);option[`${variant}Audio`]=clip(option[variant]);if(option.correct && option[variant]!==s.choices[0][variant].chunks.join(''))throw new Error('Correct reply mismatch')}
    for(const c of s.choices)if(c.responseLine){c.responseLine.pinyin=pinyin(c.responseLine.zh);c.responseLine.audio=clip(c.responseLine.zh)}
    for(const c of s.choices)for(const variant of ['simple','rich']){
      const a=c[variant];if(a.chunks.length<3||a.chunks.length>7)throw new Error(`Bad chunk count: ${ep.id}/${s.id}/${c.id}`)
      a.distractorPinyin=(a.distractors??[]).map(w=>pinyin(w));a.pinyin=a.chunks.map(w=>pinyin(w));a.audio=clip(a.chunks.join(''))
      for(const seq of a.alternatives??[])if(seq.length!==a.chunks.length||new Set(seq).size!==seq.length||seq.some(i=>!Number.isInteger(i)||i<0||i>=seq.length))throw new Error('Invalid alternative')
    }
  }
}
if(audioOnly){
  await mkdir('public/game/v3/audio',{recursive:true});await mkdir('node_modules/.cache/game-audio',{recursive:true})
  for(const [file,text] of audio){
    try{if((await stat(`public/game/v3/${file}`)).size>1000)continue}catch{}
    const temp='node_modules/.cache/game-audio/line.aiff'
    run('say',['-v','Tingting','-r','165','-o',temp,text])
    run(process.env.FFMPEG || 'ffmpeg',['-y','-loglevel','error','-i',temp,'-ac','1','-ar','22050','-c:a','aac','-b:a','32k',`public/game/v3/${file}`])
    if ((await stat(`public/game/v3/${file}`)).size < 1000) throw new Error('Empty speech output: the macOS voice may require an unsandboxed run')
  }
  console.log(`Prepared ${audio.size} Mandarin clips with installed Tingting voice.`);process.exit(0)
}
const js=await readFile('stories/chengdu/player.js','utf8'),css=await readFile('stories/chengdu/player.css','utf8')
const files={}
for(const ep of episodes){
  const resources=new Set([`${ep.id}.html`,'courtyard.webp','characters.webp'])
  for(const s of ep.scenes){resources.add(s.line.audio);for(const c of s.choices){resources.add(c.simple.audio);resources.add(c.rich.audio);if(c.responseLine)resources.add(c.responseLine.audio)}for(const o of s.options??[]){resources.add(o.simpleAudio);resources.add(o.richAudio)}}
  ep.resources=[...resources]
  const story=`:: StoryTitle\n${ep.title}\n\n:: StoryData\n${JSON.stringify({ifid:`DB0A0310-85B7-4CDA-A2B0-00000000000${episodes.indexOf(ep)+1}`,format:'SugarCube','format-version':'2.37.3',start:'Start'})}\n\n:: StoryScript [script]\nsetup.episode=${JSON.stringify(ep)};\n${js}\n\n:: StoryStylesheet [stylesheet]\n${css}\n\n:: Start\n<<chengduScene>>\n\n${ep.scenes.map((s,i)=>`:: Scene${i+1}\n<<chengduScene>>\n`).join('\n')}\n:: Ending\n<<chengduScene>>\n`
  const source=`stories/chengdu/${ep.id}.twee`,html=`public/game/v3/${ep.id}.html`
  if(check){if(await readFile(source,'utf8')!==story)throw new Error(`Stale ${source}: run game:build`)}
  else{
    await writeFile(source,story)
    const compiler=process.env.TWEEGO||'tweego'
    if(!String(spawnSync(compiler,['--version'],{encoding:'utf8'}).stderr).includes('2.1.1'))throw new Error('Tweego 2.1.1 required')
    const r=spawnSync(compiler,['-f','sugarcube-2','-o',html,source],{encoding:'utf8',env:{...process.env,TWEEGO_PATH:`${root}/vendor/twine`}})
    if(r.status!==0)throw new Error(r.stderr||'Compilation failed')
  }
  ep.bytes=0
  for(const r of resources){const p=`public/game/v3/${r}`,data=await readFile(p);if(r.endsWith('.m4a') && data.length<1000)throw new Error(`Empty audio: ${p}`);files[p]=hash(data);ep.bytes+=data.length}
  if(ep.bytes>3*1024*1024)throw new Error(`${ep.id} exceeds 3 MB`)
  console.log(`${ep.id}: ${Math.round(ep.bytes/1024)} KB including audio`)
}
const catalog=JSON.stringify(episodes,null,2)+'\n'
const inputs=['stories/chengdu/episodes.json','stories/chengdu/player.js','stories/chengdu/player.css','scripts/build-game.mjs','vendor/twine/sugarcube-2/format.js']
for(const f of inputs)files[f]=hash(await readFile(f))
const manifest=JSON.stringify({compiler:'Tweego 2.1.1',format:'SugarCube 2.37.3',files},null,2)+'\n'
if(check){
  if(await readFile('src/game/catalog.json','utf8')!==catalog||await readFile('stories/chengdu/build-manifest.json','utf8')!==manifest)throw new Error('Stale game build or assets: run game:build')
}else{await writeFile('src/game/catalog.json',catalog);await writeFile('stories/chengdu/build-manifest.json',manifest)}
