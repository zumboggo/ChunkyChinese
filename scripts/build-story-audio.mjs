import {readFileSync,writeFileSync,mkdirSync,readdirSync} from 'node:fs'
import {resolve} from 'node:path'
import {addEpisodeAudio} from './lib/episode-audio.mjs'
const root=resolve(import.meta.dirname,'..'),only=process.argv.includes('--pinyin-only'),chosen=process.argv.find(a=>a.startsWith('--episode='))?.slice(10)
const directory=resolve(root,'stories/animated');mkdirSync(resolve(root,'public/stories/animated'),{recursive:true})
for(const file of readdirSync(directory).filter(f=>f.endsWith('.json')&&(!chosen||f===chosen+'.json'))){
 const pack=JSON.parse(readFileSync(resolve(directory,file),'utf8'))
 const result=addEpisodeAudio(pack,{cache:resolve(root,'.local/story-audio'),pinyinOnly:only})
 writeFileSync(resolve(directory,file),JSON.stringify(pack,null,2)+'\n');writeFileSync(resolve(root,'public/stories/animated',file),JSON.stringify(pack))
 console.log(`${file}: ${result.entries} Mandarin lines, ${only?'pinyin':`${result.generated} new / ${result.reused} cached clips`}`)
}
