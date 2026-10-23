// Future cast library only. The legacy cast builder owns historical releases.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs'
import {dirname} from 'node:path'
import {createCharacter} from '../src/game/animation/shared/engine/character-builder.js'
const check=process.argv.includes('--check')
const recipes=JSON.parse(readFileSync('stories/characters/lms-lineup-cast.json','utf8'))
const cast=Object.fromEntries(recipes.map(recipe=>[recipe.id,createCharacter(recipe)]))
function output(path,data,pretty=true){const text=JSON.stringify(data,null,pretty?2:undefined)+(pretty?'\n':'');if(check){if(readFileSync(path,'utf8')!==text)throw Error('Lineup needs rebuilding: '+path)}else{mkdirSync(dirname(path),{recursive:true});writeFileSync(path,text)}}
output('public/stories/animated/cast/lms-lineup.json',cast)
const libraryPath='public/stories/animated/rigs/catalog.json'
const library=JSON.parse(readFileSync(libraryPath,'utf8')).filter(r=>!r.id.endsWith('Lineup'))
for(const recipe of recipes.slice(0,14)){
 const id=recipe.id+'Lineup'
 output(`public/stories/animated/rigs/${id.toLowerCase()}-cartoon.json`,cast[recipe.id])
 library.push({id,name:cast[recipe.id].name+' · lineup'})
}
output(libraryPath,library.sort((a,b)=>a.id.localeCompare(b.id)),false)
console.log(`${check?'Verified':'Built'} ${Object.keys(cast).length} future cast designs; immutable releases untouched.`)
