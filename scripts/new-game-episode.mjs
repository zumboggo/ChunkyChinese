import {readFile,writeFile,readdir} from 'node:fs/promises'
import {randomUUID} from 'node:crypto'
import {fileURLToPath} from 'node:url'
import {validate} from './game-content.mjs'
process.chdir(process.env.GAME_PROJECT_ROOT||fileURLToPath(new URL('../',import.meta.url)))
const args=process.argv.slice(2),id=args[0],option=(name,fallback)=>{const i=args.indexOf('--'+name);return i<0?fallback:args[i+1]}
if(!/^[a-z][a-z0-9-]*$/.test(id||''))throw new Error('Usage: npm run game:new -- episode-id --title "A new afternoon" [--character lin] [--location courtyard]')
const world=JSON.parse(await readFile('stories/chengdu/world.json','utf8'))
const files=await readdir('stories/chengdu/episodes'),episodes=await Promise.all(files.filter(f=>f.endsWith('.json')).map(async f=>JSON.parse(await readFile('stories/chengdu/episodes/'+f,'utf8'))))
if(episodes.some(e=>e.id===id))throw new Error('That episode ID already exists; no files changed.')
const character=option('character','lin'),location=option('location','courtyard'),title=option('title','A new afternoon')
if(!world.characters[character]||!world.locations[location])throw new Error('Choose a character and location from world.json.')
const ep=JSON.parse(await readFile('stories/chengdu/episode-template.json','utf8'))
Object.assign(ep,{id,ifid:randomUUID().toUpperCase(),version:1,order:Math.max(0,...episodes.map(e=>e.order))+1,title,mapLabel:title,location,participants:[character],milestone:id,place:world.locations[location].name})
ep.scenes.forEach(s=>s.speaker=character)
if(world.milestones[id])throw new Error('Milestone ID already exists; choose a different episode ID.')
world.milestones[id]={title:`A conversation: ${title}`}
validate([...episodes,ep],world)
await writeFile(`stories/chengdu/episodes/${id}.json`,JSON.stringify(ep,null,2)+'\n',{flag:'wx'})
await writeFile('stories/chengdu/world.json',JSON.stringify(world,null,2)+'\n')
console.log(`Created ${id}: four playable starter exchanges. Replace the sample dialogue with your topic, then run game:audio -- --episode ${id} and game:build -- --episode ${id}. A shared-world change may require a full build.`)
