import {readFileSync,writeFileSync,mkdirSync,readdirSync,statSync} from 'node:fs'
import {resolve} from 'node:path'
import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {pinyin} from 'pinyin-pro'
import {compileStory} from '../src/game/animation/shared/engine/story-engine.js'
const root=resolve(import.meta.dirname,'..'),only=process.argv.includes('--pinyin-only'),chosen=process.argv.find(a=>a.startsWith('--episode='))?.slice(10)
const directory=resolve(root,'stories/animated'),cache=resolve(root,'.local/story-audio');mkdirSync(cache,{recursive:true});mkdirSync(resolve(root,'public/stories/animated'),{recursive:true})
for(const file of readdirSync(directory).filter(f=>f.endsWith('.json')&&(!chosen||f===chosen+'.json'))){
 const pack=JSON.parse(readFileSync(resolve(directory,file),'utf8')),c=compileStory(pack.script,pack.assets);if(c.errors.length)throw Error(JSON.stringify(c.errors))
 pack.chinese??={lines:{}};const texts=[...new Set(c.story.nodes.flatMap(n=>n.type==='say'?[n.text]:n.type==='choice'?n.options.map(o=>o.text):[]).filter(t=>/[\u3400-\u9fff]/u.test(t)))];
 for(const text of texts){const line=pack.chinese.lines[text]??={};line.pinyin=pinyin(text);if(only)continue
  const key=createHash('sha256').update('Tingting:165:AAC:32000:'+text).digest('hex');const output=resolve(cache,key+'.m4a')
  if(!statSync(output,{throwIfNoEntry:false})?.size){const input=resolve(cache,key+'.txt');writeFileSync(input,text);const pcm=resolve(cache,key+'.aiff');execFileSync('/usr/bin/say',['-v','Tingting','-r','165','-f',input,'-o',pcm]);execFileSync('/usr/bin/afconvert',['-f','m4af','-d','aac ','-b','32000',pcm,output]);}
  if(statSync(output).size<100)throw Error('Empty speech file: '+text)
  line.audio='data:audio/mp4;base64,'+readFileSync(output).toString('base64')
 }
 writeFileSync(resolve(directory,file),JSON.stringify(pack,null,2)+'\n');writeFileSync(resolve(root,'public/stories/animated',file),JSON.stringify(pack))
 console.log(`${file}: ${texts.length} Mandarin lines, ${only?'pinyin':'pinyin and cached audio'}`)
}
