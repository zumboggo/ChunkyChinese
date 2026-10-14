import {readFileSync,writeFileSync,mkdirSync} from 'node:fs'
import {dirname} from 'node:path'
import {createCharacter} from '../src/game/animation/shared/engine/character-builder.js'
const check=process.argv.includes('--check')
const recipes=JSON.parse(readFileSync('stories/characters/lms-cast.json','utf8'))
const cast=Object.fromEntries(recipes.map(r=>[r.id,createCharacter(r)]))
function output(path,value,pretty=true){const text=JSON.stringify(value,null,pretty?2:undefined)+(pretty?'\n':'');if(check){if(readFileSync(path,'utf8')!==text)throw Error('Cast output needs rebuilding: '+path)}else{mkdirSync(dirname(path),{recursive:true});writeFileSync(path,text)}}
output('public/stories/animated/cast/lms.json',cast)
// New immutable presentation releases: every line, clip and branch stays byte-for-byte equivalent as data.
for(const [from,to] of [['moonlight-01-v2','moonlight-01-v3'],['moonlight-02-v2','moonlight-02-v3'],['moonlight-03','moonlight-03-v2']]){
 const pack=JSON.parse(readFileSync(`stories/animated/${from}.json`,'utf8'))
 for(const id of Object.keys(pack.assets.characters))if(cast[id])pack.assets.characters[id]=cast[id]
 output(`stories/animated/${to}.json`,pack);output(`public/stories/animated/${to}.json`,pack,false)
}
console.log(`${check?'Verified':'Built'} reusable LMS cast and three presentation releases.`)
