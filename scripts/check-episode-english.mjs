import fs from 'node:fs/promises'
import {englishText,englishKey} from './lib/episode-english-audio.mjs'
const catalog=JSON.parse(await fs.readFile('public/stories/animated/catalog.json','utf8'))
const checked=new Set(),missing=[]
for(const entry of catalog){
 const pack=JSON.parse(await fs.readFile('public/stories/animated/'+entry.path,'utf8'))
 for(const line of Object.values(pack.chinese?.lines??{})){
  const text=englishText(line);if(!text)continue
  const key=englishKey(text);if(checked.has(key))continue;checked.add(key)
  try{const data=await fs.readFile(`public/stories/audio/${key}.m4a`);if(data.length<100||data.toString('ascii',4,8)!=='ftyp')throw Error('Invalid audio')}
  catch{missing.push({episode:entry.id,key})}
 }
}
if(missing.length){console.error(`${missing.length} missing English recordings; run game:audio:english with generation authorization.`,missing.slice(0,5));process.exitCode=1}
else console.log(`Verified ${checked.size} English recordings across ${catalog.length} current episodes.`)
