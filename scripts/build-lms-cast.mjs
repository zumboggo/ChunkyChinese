import {readFileSync,writeFileSync,mkdirSync} from 'node:fs'
import {dirname} from 'node:path'
import {createCharacter} from '../src/game/animation/shared/engine/character-builder.js'
const check=process.argv.includes('--check')
const recipes=JSON.parse(readFileSync('stories/characters/lms-cast.json','utf8'))
const cast=Object.fromEntries(recipes.map(r=>[r.id,createCharacter(r)]))
function output(path,value,pretty=true){const text=JSON.stringify(value,null,pretty?2:undefined)+(pretty?'\n':'');if(check){if(readFileSync(path,'utf8')!==text)throw Error('Cast output needs rebuilding: '+path)}else{mkdirSync(dirname(path),{recursive:true});writeFileSync(path,text)}}
output('public/stories/animated/cast/lms.json',cast)
const libraryPath='public/stories/animated/rigs/catalog.json'
const library=JSON.parse(readFileSync(libraryPath,'utf8')).filter(r=>!cast[r.id])
for(const [id,character] of Object.entries(cast)){
 output(`public/stories/animated/rigs/${id.toLowerCase()}-cartoon.json`,character)
 library.push({id,name:character.name})
}
output(libraryPath,library,false)
// New immutable presentation releases: every line, clip and branch stays byte-for-byte equivalent as data.
for(const [from,to] of [['moonlight-01-v4','moonlight-01-v5'],['moonlight-02-v4','moonlight-02-v5'],['moonlight-03-v3','moonlight-03-v4'],['moonlight-04','moonlight-04-v2']]){
 const pack=JSON.parse(readFileSync(`stories/animated/${from}.json`,'utf8'))
 for(const id of Object.keys(pack.assets.characters))if(cast[id])pack.assets.characters[id]=cast[id]
 output(`stories/animated/${to}.json`,pack);output(`public/stories/animated/${to}.json`,pack,false)
}
console.log(`${check?'Verified':'Built'} reusable LMS cast and four presentation releases.`)
