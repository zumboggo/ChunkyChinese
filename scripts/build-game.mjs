import {readFile,writeFile,mkdir,stat,copyFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'
import {pinyin} from 'pinyin-pro'
import {loadContent} from './game-content.mjs'
const root=process.env.GAME_PROJECT_ROOT||fileURLToPath(new URL('../',import.meta.url));process.chdir(root)
const check=process.argv.includes('--check'),audioOnly=process.argv.includes('--audio'),at=process.argv.indexOf('--episode'),target=at<0?null:process.argv[at+1]
const {episodes,world,files:contentFiles}=await loadContent()
if(target&&!episodes.some(e=>e.id===target))throw new Error('Unknown episode: '+target)
const hash=value=>createHash('sha256').update(value).digest('hex'),audio=new Map(),art=new Map()
const run=(bin,args)=>{const r=spawnSync(bin,args,{encoding:'utf8'});if(r.status!==0)throw new Error(r.error?.message||r.stderr);return r.stdout}
function clip(text){const file=`game/audio/${hash(`Tingting:165:v1:${text}`).slice(0,20)}.m4a`;audio.set(file,text);return file}
function enrich(line){line.pinyin=pinyin(line.zh);line.audio=clip(line.zh)}
async function asset(name){if(art.has(name))return art.get(name);const data=await readFile(`stories/chengdu/assets/${name}`),path=`game/art/${hash(data).slice(0,12)}-${name}`;art.set(name,path);if(!check){await mkdir('public/game/art',{recursive:true});await writeFile(`public/${path}`,data)}return path}
for(const c of Object.values(world.characters)){c.portrait.asset=await asset(c.portrait.asset);enrich(c.greeting)}
for(const l of Object.values(world.locations))l.background=await asset(l.background)
for(const f of Object.values(world.facts))enrich(f.line)
for(const b of Object.values(world.bonuses))enrich(b.line)
for(const ep of episodes){
 ep.place=world.locations[ep.location].name
 const people=new Set(ep.participants)
 ep.world={...world,locations:{[ep.location]:world.locations[ep.location]},milestones:Object.fromEntries(Object.entries(world.milestones).filter(([id])=>world.goal.milestones.includes(id)||id===ep.milestone)),characters:Object.fromEntries(Object.entries(world.characters).filter(([id])=>people.has(id))),bonuses:Object.fromEntries(Object.entries(world.bonuses).filter(([,b])=>people.has(b.character))),facts:Object.fromEntries(Object.entries(world.facts).filter(([,f])=>people.has(f.character)))}
 ep.document=`game/episodes/${ep.id}/v${ep.version}/index.html`
 for(const s of ep.scenes){enrich(s.line);for(const c of s.choices){enrich(c.responseLine);for(const variant of ['simple','rich']){const a=c[variant];a.pinyin=a.chunks.map(x=>pinyin(x));a.distractorPinyin=(a.distractors??[]).map(x=>pinyin(x));a.audio=clip(a.chunks.join(''))}}for(const o of s.options??[])for(const v of ['simple','rich']){o[v+'Pinyin']=pinyin(o[v]);o[v+'Audio']=clip(o[v])}}
 const m=ep.memoryCheck;if(m)[m.question,m.repair,m.introduction,...m.options.map(o=>o.line)].forEach(enrich)
}
function resources(ep){const set=new Set([ep.document,world.locations[ep.location].background]);function walk(value){if(!value||typeof value!=='object')return;for(const [key,v] of Object.entries(value)){if(typeof v==='string'&&((key==='audio'||key.endsWith('Audio'))||key==='asset'))set.add(v);else if(typeof v==='object')walk(v)}}walk(ep.scenes);walk(ep.world.characters);walk(ep.world.bonuses);walk(ep.world.facts);walk(ep.memoryCheck);return [...set]}
if(audioOnly){
 await mkdir('public/game/audio',{recursive:true});await mkdir('node_modules/.cache/game-audio',{recursive:true})
 const needed=new Set(episodes.filter(e=>!target||e.id===target).flatMap(resources))
 for(const [file,text]of audio){if(!needed.has(file))continue;try{if((await stat('public/'+file)).size>1000)continue}catch{}
  // Reuse the same content-addressed clips from earlier releases when available.
  let reused=false;for(const version of [3,2,1])try{const old=`public/game/v${version}/audio/${file.split('/').pop()}`;if((await stat(old)).size>1000){await copyFile(old,'public/'+file);reused=true;break}}catch{}
  if(reused)continue
  const temp='node_modules/.cache/game-audio/line.aiff';run('say',['-v','Tingting','-r','165','-o',temp,text]);run(process.env.FFMPEG||'ffmpeg',['-y','-loglevel','error','-i',temp,'-ac','1','-ar','22050','-c:a','aac','-b:a','32k','public/'+file]);if((await stat('public/'+file)).size<1000)throw new Error('Empty speech; run with access to the installed macOS voice')
 }
 console.log('Prepared requested Mandarin clips.');process.exit(0)
}
const js=await readFile('stories/chengdu/player.js','utf8'),css=await readFile('stories/chengdu/player.css','utf8'),files={}
await mkdir('stories/chengdu/generated',{recursive:true});await mkdir('src/game',{recursive:true})
for(const ep of episodes){
 ep.resources=resources(ep)
 const story=`:: StoryTitle\n${ep.title}\n\n:: StoryData\n${JSON.stringify({ifid:ep.ifid,format:'SugarCube','format-version':'2.37.3',start:'Start'})}\n\n:: StoryScript [script]\nsetup.episode=${JSON.stringify(ep)};\n${js}\n\n:: StoryStylesheet [stylesheet]\n${css}\n\n:: Start\n<<chengduScene>>\n\n${ep.scenes.map((s,i)=>`:: Scene${i+1}\n<<chengduScene>>\n`).join('\n')}\n:: Ending\n<<chengduScene>>\n`
 const source=`stories/chengdu/generated/${ep.id}.twee`,html='public/'+ep.document
 if(check||(target&&ep.id!==target)){if(await readFile(source,'utf8')!==story)throw new Error(`Stale ${ep.id}; run a full game:build`)}
 else{
  await mkdir(html.slice(0,html.lastIndexOf('/')),{recursive:true});await writeFile(source,story)
  const compiler=process.env.TWEEGO||'tweego';if(!String(spawnSync(compiler,['--version'],{encoding:'utf8'}).stderr).includes('2.1.1'))throw new Error('Tweego 2.1.1 required')
  const r=spawnSync(compiler,['-f','sugarcube-2','-o',html,source],{encoding:'utf8',env:{...process.env,TWEEGO_PATH:`${root}/vendor/twine`}});if(r.status!==0)throw new Error(r.stderr)
 }
 ep.bytes=0
 for(const r of ep.resources){const path='public/'+r,data=await readFile(path);if(r.endsWith('.m4a')&&data.length<1000)throw new Error('Empty audio '+r);files[path]=hash(data);ep.bytes+=data.length}
 if(ep.bytes>3*1024*1024)throw new Error(ep.id+' exceeds 3 MB');console.log(`${ep.id}: ${Math.round(ep.bytes/1024)} KB`)
}
const inputs=['stories/chengdu/world.json',...contentFiles.map(f=>'stories/chengdu/episodes/'+f),...art.keys()].map(p=>p.includes('/')?p:'stories/chengdu/assets/'+p).concat(['stories/chengdu/player.js','stories/chengdu/player.css','scripts/build-game.mjs','scripts/game-content.mjs','vendor/twine/sugarcube-2/format.js'])
for(const path of inputs)files[path]=hash(await readFile(path))
for(const [path,value]of [['src/game/catalog.json',episodes],['src/game/world.json',world],['stories/chengdu/build-manifest.json',{compiler:'Tweego 2.1.1',format:'SugarCube 2.37.3',files}]]){const text=JSON.stringify(value,null,2)+'\n';if(check){if(await readFile(path,'utf8')!==text)throw new Error('Stale '+path)}else await writeFile(path,text)}
