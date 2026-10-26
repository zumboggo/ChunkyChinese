import fs from 'node:fs/promises'
import {generateEpisodeEnglish} from './lib/episode-english-audio.mjs'
const catalog=JSON.parse(await fs.readFile('public/stories/animated/catalog.json','utf8'))
const packs=await Promise.all(catalog.map(e=>fs.readFile('public/stories/animated/'+e.path,'utf8').then(JSON.parse)))
await generateEpisodeEnglish(packs,{dryRun:process.argv.includes('--dry-run'),maxEstimatedCost:Number(process.argv.find(a=>a.startsWith('--max-estimated-cost='))?.split('=')[1]??0)})
