import {readFileSync,writeFileSync,mkdirSync,statSync,renameSync} from 'node:fs'
import {resolve} from 'node:path'
import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {pinyin} from 'pinyin-pro'
import {compileStory} from '../../src/game/animation/shared/engine/story-engine.js'
export function addEpisodeAudio(pack,{cache=resolve('.local/story-audio'),pinyinOnly=false}={}){
 mkdirSync(cache,{recursive:true})
 const c=compileStory(pack.script,pack.assets);if(c.errors.length)throw Error(JSON.stringify(c.errors))
 pack.chinese??={lines:{}}
 const texts=[...new Set(c.story.nodes.flatMap(n=>n.type==='say'?[n.text]:n.type==='choice'?n.options.map(o=>o.text):[]).filter(t=>/[\u3400-\u9fff]/u.test(t)))]
 let generated=0,reused=0
 for(const text of texts){
  const line=pack.chinese.lines[text]??={};line.pinyin??=pinyin(text)
  for(const chunk of line.interlinear??[])chunk.pinyin??=pinyin(chunk.chinese)
  if(pinyinOnly)continue
  const key=createHash('sha256').update('Tingting:165:AAC:32000:'+text).digest('hex'),output=resolve(cache,key+'.m4a')
  if((statSync(output,{throwIfNoEntry:false})?.size??0)<100){
   const input=resolve(cache,key+'.txt'),pcm=resolve(cache,key+`.${process.pid}.aiff`),temp=resolve(cache,key+`.${process.pid}.m4a`)
   writeFileSync(input,text)
   try{execFileSync('/usr/bin/say',['-v','Tingting','-r','165','-f',input,'-o',pcm]);execFileSync('/usr/bin/afconvert',['-f','m4af','-d','aac ','-b','32000',pcm,temp])}
   catch(e){throw Error('Local Mandarin audio generation failed. Check macOS speech/audio service access before retrying; completed clips remain cached.',{cause:e})}
   if(statSync(temp).size<100)throw Error('Empty speech file: '+text)
   renameSync(temp,output);generated++
  }else reused++
  line.audio='data:audio/mp4;base64,'+readFileSync(output).toString('base64')
 }
 return {entries:texts.length,generated,reused}
}
