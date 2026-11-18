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
  if(pack.audioLanguage==='mandarin-only'){
   const speaker=c.story.nodes.find(n=>n.type==='say'&&n.text===text)?.actor
   const female=['Connie','Hannah','Cly'].includes(speaker)
   const voice=female?'zh-CN-XiaoxiaoNeural':'zh-CN-YunxiNeural'
   const key=createHash('sha256').update(`edge:${voice}:rate=-10%:pitch=+0Hz:volume=+0%:audio-24khz-48kbitrate-mono-mp3:${text}`).digest('hex')
   const output=resolve(cache,key+'.mp3')
   if((statSync(output,{throwIfNoEntry:false})?.size??0)<100){
    const input=resolve(cache,key+'.txt'),temp=resolve(cache,key+`.${process.pid}.mp3`)
    writeFileSync(input,text)
    execFileSync(process.env.EPISODE_PYTHON||'.local/jedi-tools/bin/python',['scripts/episode-edge-tts.py',input,temp,voice],{timeout:90000})
    if(statSync(temp).size<100)throw Error('Empty Edge recording')
    renameSync(temp,output);generated++
   }else reused++
   line.audio='data:audio/mpeg;base64,'+readFileSync(output).toString('base64')
   continue
  }
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
