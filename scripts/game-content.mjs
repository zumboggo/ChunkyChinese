import {readFile,readdir} from 'node:fs/promises'
export async function loadContent(){
 const world=JSON.parse(await readFile('stories/chengdu/world.json','utf8'))
 const files=(await readdir('stories/chengdu/episodes')).filter(f=>f.endsWith('.json')).sort()
 const episodes=await Promise.all(files.map(async f=>JSON.parse(await readFile(`stories/chengdu/episodes/${f}`,'utf8'))))
 episodes.sort((a,b)=>a.order-b.order||a.id.localeCompare(b.id));validate(episodes,world)
 return {episodes,world,files}
}
export function validate(episodes,w){
 if(!Array.isArray(episodes)||!episodes.length)throw new Error('At least one episode required')
 const ids=new Set(),ifids=new Set(),memoryIds=new Set()
 const require=(ok,text)=>{if(!ok)throw new Error(text)}
 const line=l=>require(l&&typeof l.zh==='string'&&l.zh.trim()&&typeof l.english==='string','Line needs Chinese and meaning')
 const slug=x=>typeof x==='string'&&/^[a-z][a-z0-9-]*$/.test(x)
 for(const [id,c] of Object.entries(w.characters)){require(slug(id)&&c.name&&c.role&&/^[\w.-]+$/.test(c.portrait.asset)&&c.portrait.column>=0&&c.portrait.column<c.portrait.columns,'Invalid character');line(c.greeting)}
 for(const l of Object.values(w.locations))require(l.name&&/^[\w.-]+$/.test(l.background),'Invalid location')
 for(const f of Object.values(w.facts)){require(w.characters[f.character],'Unknown fact owner');line(f.line)}
 for(const b of Object.values(w.bonuses)){require(w.characters[b.character]&&b.threshold>=4&&b.title&&b.narration,'Invalid bonus');line(b.line)}
 require(w.goal.milestones.every(id=>w.milestones[id]),'Unknown goal milestone')
 for(const ep of episodes){
  require(slug(ep.id)&&!ids.has(ep.id),'Duplicate or invalid episode ID');ids.add(ep.id)
  require(/^[0-9a-f-]{36}$/i.test(ep.ifid)&&!ifids.has(ep.ifid),'Unique story IFID required');ifids.add(ep.ifid)
  require(Number.isInteger(ep.version)&&ep.version>0&&Number.isFinite(ep.order)&&ep.mapLabel&&ep.title&&ep.ending,'Episode metadata missing')
  require(w.locations[ep.location]&&ep.participants.length&&new Set(ep.participants).size===ep.participants.length&&ep.participants.every(id=>w.characters[id]),'Unknown participants/location')
  require(w.milestones[ep.milestone]&&Array.isArray(ep.vocabularyRefs)&&ep.newWords.length<=3,'Invalid milestone/vocabulary references')
  require(ep.scenes.length===4&&ep.scenes.filter(s=>s.promptMode==='listen').length===1,'Three choices, one listening-only prompt, then one builder required')
  const sceneIds=new Set()
  ep.scenes.forEach((s,i)=>{
   require(slug(s.id)&&!sceneIds.has(s.id),'Duplicate scene ID');sceneIds.add(s.id)
   require(s.kind===(i===3?'build':'choice')&&s.paragraphs.length&&['text','listen',undefined].includes(s.promptMode)&&(s.promptMode!=='listen'||i<3)&&s.clue&&s.choices.length===1&&ep.participants.includes(s.speaker),'Invalid scene shape/speaker')
   line(s.line);require((s.learnFacts??[]).every(id=>w.facts[id]&&ep.participants.includes(w.facts[id].character)),'Unknown learned fact')
   const c=s.choices[0];require(c.id&&c.hint,'Missing answer metadata');line(c.responseLine)
   for(const variant of ['simple','rich']){
    const a=c[variant];require(a.chunks.length>=3&&a.chunks.length<=7&&a.chunks.every(x=>typeof x==='string'&&x.length)&&a.english,'Invalid chunks')
    if(s.kind==='build')require(a.chunks.length>=5&&a.distractors?.length>=1&&a.distractors.length<=2&&a.distractors.every(x=>!a.chunks.includes(x)),'Builder needs longer reply and distinct distractors')
    for(const seq of a.alternatives??[])require(seq.length===a.chunks.length&&new Set(seq).size===seq.length&&seq.every(x=>Number.isInteger(x)&&x>=0&&x<a.chunks.length),'Invalid accepted sequence')
   }
   if(s.kind==='choice'){
    require(s.options.length===3&&new Set(s.options.map(o=>o.id)).size===3&&s.options.filter(o=>o.correct).length===1,'Exactly one correct option required')
    for(const variant of ['simple','rich'])require(new Set(s.options.map(o=>o[variant])).size===3&&s.options.find(o=>o.correct)[variant]===c[variant].chunks.join(''),'Option text mismatch')
   }
  })
  if(ep.memoryCheck){const m=ep.memoryCheck;require(slug(m.id)&&!memoryIds.has(m.id),'Memory event IDs must be unique');memoryIds.add(m.id);require(w.facts[m.fact]&&ep.participants.includes(w.facts[m.fact].character)&&ep.participants.includes(m.speaker)&&m.options.length>=2&&m.options.filter(o=>o.correct).length===1&&new Set(m.options.map(o=>o.id)).size===m.options.length,'Invalid memory prerequisites/options');[m.question,m.repair,m.introduction,...m.options.map(o=>o.line)].forEach(line)}
 }
}
