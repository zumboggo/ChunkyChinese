import fs from 'node:fs';
import {validSceneWire} from './downloadable-scene.mjs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {loadDirection, validateDirection} from './story-direction.mjs';
import {episodeId} from './episode-target.mjs';
import {migrationMap} from './migration-map.mjs';
import {validate} from '../reader/src/embeddedjs/transfer.js';
import art from '../reader/src/embeddedjs/art.js';
export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const app=path.resolve(root,'..');
export function exportEpisode(d,id='supportive-11',direction=loadDirection(id)) {
 episodeId(id);
 const cues=validateDirection(d.script,id,direction);
 const animatedCast=new Set(direction?.animatedCast||[]);
 const annotations=d.chinese.lines, nodes=[], labels={}, cast=new Set(); let scene='train', narrator='Alden', choice=null, pending=null, lineNumber=0;
 function phrases(text) {
  const a=annotations[text]; if(!a?.interlinear?.length)throw Error('Missing chunks: '+text);
  if(a.interlinear.map(c=>c.chinese).join('')!==text)throw Error('Chunk mismatch: '+text);
  const out=[];
  for(const c of a.interlinear){
   if(!c.pinyin||!c.gloss)throw Error('Incomplete annotation');
   const p={zh:c.chinese.normalize('NFC'),py:c.pinyin.normalize('NFC').replace(/\s+([，。！？；：、])/g,'$1').trim(),en:c.gloss.normalize('NFC')};
   const prev=out.at(-1);
   if(prev&&!/[。！？；，]$/.test(prev.zh)&&prev.zh.length+p.zh.length<=8&&(prev.py+' '+p.py).length<=44&&(prev.en+' '+p.en).length<=60){prev.zh+=p.zh;prev.py+=' '+p.py;prev.en+=' '+p.en;}
   else out.push(p);
  }
  return out;
 }
 const emotion=(actor,e)=>actor==='Hannah'?({happy:'warm',neutral:'neutral',worried:'worried',sad:'sad',determined:'determined',excited:'excited',curious:'neutral',confused:'worried'}[e]||'neutral'):actor==='YoungAlden'?({curious:'curious',worried:'worried',confused:'confused'}[e]||'thoughtful'):({sad:'sad',determined:'determined'}[e]||'thoughtful');
 for(const raw of d.script.split('\n')){
  const line=raw.trim(); if(!line||line==='story 2')continue;
  let m;
  if((m=line.match(/^label (\S+)$/))){if(Object.hasOwn(labels,m[1]))throw Error('Duplicate label: '+m[1]);labels[m[1]]=nodes.length;choice=null;if(cues.has(m[1]))nodes.push({type:'animation',...(typeof cues.get(m[1])==='string'?{id:cues.get(m[1])}:cues.get(m[1]))});continue;}
  if((m=line.match(/^scene (\S+)$/))){scene=m[1];narrator=scene==='restaurant'?'YoungAlden':'Alden';pending={actor:narrator,emotion:'thoughtful',scene};continue;}
  if((m=line.match(/^show (\S+) (\S+)/))){cast.add(m[1]);if(m[1]===narrator)pending={actor:m[1],emotion:emotion(m[1],m[2]),scene};continue;}
  if((m=line.match(/^choice (\S+)$/))){choice={type:'choice',id:m[1],options:[]};nodes.push(choice);continue;}
  if((m=line.match(/^option (\S+) "([^"]+)" -> (\S+)$/))){if(!choice)throw Error('Orphan option');choice.options.push({id:m[1],phrases:phrases(m[2]),to:m[3]});continue;}
  if((m=line.match(/^goto (\S+)$/))){nodes.push({type:'goto',to:m[1]});continue;}
  if(line==='end'){nodes.push({type:'end'});continue;}
  if((m=line.match(/^(\w+)(?: \[([^\]]+)\])?: (.+)$/))){
   const speaker=m[1]==='I'?narrator:m[1], mood=emotion(speaker,(m[2]||'neutral').split(',')[0]);
   if(pending){nodes.push({type:'reaction',...pending});pending=null;}
   // A portrait at the first dialogue and selected emotional turns, never beside every phrase.
   if(!animatedCast.has(speaker)&&m[1]!=='I'&&(!nodes.some(n=>n.speaker===speaker)||['sad','determined','excited','confused'].includes((m[2]||'').split(',')[0])))nodes.push({type:'reaction',actor:speaker,emotion:mood,scene});
   lineNumber++;
   if(!animatedCast.has(speaker)&&lineNumber%3===0&&nodes.at(-1)?.type!=='reaction')nodes.push({type:'reaction',actor:speaker,emotion:mood,scene});
   nodes.push({type:'line',speaker,scene,phrases:phrases(m[3])});
   continue;
  }
  if(/^(rest|camera|express|look|orient|react) /.test(line))continue;
  throw Error('Unsupported script command: '+line);
 }
 for(const n of nodes){if(n.type==='goto'){if(labels[n.to]===undefined)throw Error('Missing label');n.to=labels[n.to];}for(const o of n.options||[]){if(labels[o.to]===undefined)throw Error('Missing target');o.to=labels[o.to];}}
 const pack={format:1,id,version:'',title:d.title,shortTitle:d.title.split(' · ').at(-1),number:Number(id.match(/-(\d+)(?:-v\d+)?$/)[1]),sources:d.sources,notice:d.notice,entry:labels.opening,nodes,cast:[...cast],...(direction?.cover?{cover:direction.cover}:{}),art:['opening','closing',...(direction?.cover?[direction.cover]:[]),...new Set(nodes.filter(n=>n.type==='reaction').map(n=>n.actor+'-'+n.emotion))]};
 pack.version=crypto.createHash('sha256').update(JSON.stringify(pack)).digest('hex').slice(0,12);return pack;
}
export function coverage(pack,glyphs){const set=new Set(glyphs);for(const n of pack.nodes)for(const p of [...(n.phrases||[]),...(n.options||[]).flatMap(o=>o.phrases)])for(const c of p.zh+p.py+p.en)if(!set.has(c))throw Error('Unsupported glyph '+c);}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),positional=args.filter(a=>a!=='--refresh-font');
 if(positional.length>1)throw Error('Usage: export.mjs [episode-id] [--refresh-font]');
 const source=episodeId(positional[0]||'supportive-11');
 const sourcePath=path.join(app,'stories/animated',source+'.json');
 if(!fs.existsSync(sourcePath))throw Error('Source episode not found: '+source);
 const d=JSON.parse(fs.readFileSync(sourcePath));
 const all=[...new Set([...fs.readdirSync(path.join(app,'stories/animated')).filter(f=>/^supportive-.*\.json$/.test(f)),source+'.json'])];let chars='';
 for(const f of all){const d=JSON.parse(fs.readFileSync(path.join(app,'stories/animated',f)));for(const [zh,a] of Object.entries(d.chinese.lines)){chars+=zh+a.pinyin+a.english;for(const c of a.interlinear||[])chars+=c.gloss+c.pinyin;}}
 chars+=Array.from({length:95},(_,i)=>String.fromCharCode(i+32)).join('')+'āáǎàēéěèīíǐìōóǒòūúǔùüǖǘǚǜńňǹḿ，。！？；：、“”‘’…·—';
 const glyphPath=path.join(root,'content/glyphs.txt');
 if(!fs.existsSync(glyphPath)||process.argv.includes('--refresh-font'))fs.writeFileSync(glyphPath,[...new Set(chars.normalize('NFC'))].sort().join(''));
 const pack=exportEpisode(d,source);coverage(pack,fs.readFileSync(glyphPath,'utf8'));
 const missing=pack.art.filter(n=>!art[n]&&!art[n+'-full']);
 if(missing.length)throw Error('Portrait/art update needed for '+source+': '+missing.join(', '));
 validate(pack,fs.readFileSync(glyphPath,'utf8'),n=>!!art[n]||!!art[n+'-full'],validSceneWire);
 pack.version=crypto.createHash('sha256').update(JSON.stringify({...pack,version:''})).digest('hex').slice(0,12);
 // Enforce the tested watch memory envelope before shipping a new package.
 const wireRecord=x=>JSON.stringify(x).replace(/[^\x20-\x7e]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'));
 const wireMeta={...pack,nodeCount:pack.nodes.length};delete wireMeta.nodes;
 const records=[wireMeta,...pack.nodes].map(wireRecord);
 if(pack.nodes.length>160||records.some(r=>r.length+1>2048)||records.reduce((n,r)=>n+r.length+1,0)>65536)throw Error('Episode exceeds the tested watch memory budget; split it before exporting');
 fs.writeFileSync(path.join(root,'reader/src/c/episode_title.h'),'// Generated bundle title.\n#define EPISODE_TITLE '+JSON.stringify(pack.shortTitle)+'\n#define EPISODE_BEGIN '+JSON.stringify('Episode '+pack.number+'   Select: begin')+'\n');
 fs.mkdirSync(path.join(root,'reader/resources/data'),{recursive:true});
 fs.writeFileSync(path.join(root,'reader/resources/data/story.ndjson'),records.join('\n')+'\n');
 const data=JSON.stringify(pack);
 fs.writeFileSync(path.join(root,'content',source+'.json'),data+'\n');
 fs.writeFileSync(path.join(root,'reader/src/pkjs/bundled.json'),data+'\n');
 for(const [name,file] of [['legacy','legacy-v1-anchors.json'],['upgrade','legacy-v1.1-anchors.json']]){
  const previous=JSON.parse(fs.readFileSync(path.join(root,'content',file)));
  const mapping=migrationMap(pack,previous);
  fs.writeFileSync(path.join(root,'reader/src/embeddedjs',name+'.js'),'export default '+JSON.stringify({...mapping,indices:mapping.indices.map(n=>String.fromCharCode(n+33)).join('')})+';\n');
 }
 const meta={...pack};delete meta.nodes;
 let byteOffset=records[0].length+1;const spans=records.slice(1).map(r=>{const pair=[byteOffset,r.length];byteOffset+=r.length+1;return pair;});
 fs.writeFileSync(path.join(root,'reader/src/embeddedjs/bundled.js'),"import io from './native';\nconst meta="+JSON.stringify({format:pack.format,id:pack.id,version:pack.version,title:pack.title,shortTitle:pack.shortTitle,number:pack.number,cover:pack.cover,entry:pack.entry,nodeCount:pack.nodes.length})+";\nlet index=-1,node;meta.nodeAt=i=>{if(i<0||i>=meta.nodeCount)return undefined;if(index!==i){node=JSON.parse(io.readStoryNode(i));index=i;}return node;};export default meta;\n");
 fs.writeFileSync(path.join(root,'reader/src/c/story_index.h'),'// Generated byte spans, held in native read-only data instead of JS slots.\nstatic const uint16_t story_spans[][2]={'+spans.map(p=>'{'+p.join(',')+'}').join(',')+'};\n');
 fs.writeFileSync(path.join(root,'reader/src/embeddedjs/episode.js'),'// Generated: parse only the current node to fit watch RAM.\nconst meta='+JSON.stringify(meta)+';\nconst rows='+JSON.stringify(pack.nodes.map(n=>JSON.stringify(n)))+';\nlet index=-1,node;meta.nodeCount=rows.length;meta.nodeAt=i=>{if(index!==i){node=JSON.parse(rows[i]);index=i;}return node;};export default meta;\n');
 const glyphs=fs.readFileSync(glyphPath,'utf8');const han=[...glyphs].filter(c=>/\p{Script=Han}/u.test(c)).join('');
 fs.writeFileSync(path.join(root,'reader/src/embeddedjs/glyphs.js'),'export default '+JSON.stringify(glyphs)+';\n');
 const manifest={ffi:{functions:{showPortrait:{arguments:['uint32_t','uint32_t'],returns:'void'},recipeData:{arguments:['uint32_t','int32_t'],returns:'uint32_t'},showScene:{arguments:['uint32_t'],returns:'void'},sceneSelect:{arguments:[],returns:'uint32_t'},setBackgroundMotion:{arguments:['uint32_t'],returns:'void'},storySize:{arguments:[],returns:'uint32_t'},readStoryNode:{arguments:['uint32_t'],returns:'char*'},readStory:{arguments:['uint32_t','uint32_t'],returns:'char*'}}},include:['$(MODDABLE)/examples/manifest_mod.json'],modules:{'*':['./main','./native','./bundled','./reader','./layout','./transfer','./glyphs','./art','./wire','./legacy','./upgrade','./scenes','./completion']}};
 fs.writeFileSync(path.join(root,'reader/src/embeddedjs/manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 console.log(JSON.stringify({id:source,nodes:pack.nodes.length,choices:pack.nodes.filter(n=>n.type==='choice').length,phrases:pack.nodes.reduce((s,n)=>s+(n.phrases?.length||0)+(n.options||[]).reduce((t,o)=>t+o.phrases.length,0),0),bytes:Buffer.byteLength(data),han:han.length}));
}
