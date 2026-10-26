import {readFileSync,writeFileSync} from 'node:fs'
import {createCharacter} from '../src/game/animation/shared/engine/character-builder.js'
const rows=[
 ['Kote','科特 · Kote','adult','tousled','lean','#b6502d','#596a59'],
 ['Cob','老科布 · Old Cob','elder','cropped','broad','#aaa492','#87714d'],
 ['Graham','格雷厄姆 · Graham','adult','side-part','round','#6c503a','#65767a'],
 ['Jake','杰克 · Jake','adult','cropped','angular','#44372d','#76564c'],
 ['Shep','谢普 · Shep','adult','swept','lean','#544a3f','#6b7150'],
 ['Boy','铁匠学徒 · The smith’s apprentice','teen','tousled','oval','#58402f','#9b8662'],
 ['PatronA','客人 · Patron','adult','cropped','round','#6c503a','#65767a'],
 ['PatronB','客人 · Patron','adult','side-part','lean','#544a3f','#76564c'],
 ['Kvothe','克沃思 · Kvothe','teen','tousled','lean','#bc512b','#527565'],
 ['Simmon','西蒙 · Simmon','teen','swept','round','#b59655','#738497'],
 ['Wilem','威廉 · Wilem','teen','side-part','angular','#282725','#726052'],
 ['Manet','马内特 · Manet','elder','tousled','broad','#999084','#857663'],
 ['Sovoy','索沃伊 · Sovoy','adult','swept','angular','#523d2d','#726583'],
 ['Hemme','赫姆 · Master Hemme','adult','side-part','broad','#493b31','#41454b'],
]
const recipes=rows.map(([id,name,age,hair,face,hairColor,shirt])=>({id,name,version:1,finish:'polished',appearance:{age,hair,face,eyes:id==='Kote'||id==='Kvothe'?'keen':'default',outfit:id==='Hemme'?'robe':'workshirt',...(id==='Cob'||id==='Manet'||id==='Sovoy'?{facialHair:'full'}:{})},palette:{skin:id==='Wilem'?'#a47754':'#dfb994',hair:hairColor,shirt,trim:'#c9b892'},provenance:'Original SVG interpretation for Mandarin lessons based on the supplied Patrick Rothfuss novel. No official art or actor likeness. Future cast appearances require source-scene verification.'}))
writeFileSync('stories/characters/wind-cast.json',JSON.stringify(recipes,null,2)+'\n')
writeFileSync('public/stories/animated/cast/wind.json',JSON.stringify(Object.fromEntries(recipes.map(r=>[r.id,createCharacter(r)])),null,2)+'\n')
