import {readFileSync} from 'node:fs'
import {compileAnnotations,loadAssets} from './lib/episode-assembly.mjs'
const planPath=process.argv.find(a=>a.startsWith('--plan='))?.slice(7)
if(!planPath)throw Error('Use --plan=PLAN [--reviewed]. Freeze first with game:episode -- --plan=PLAN --draft --freeze.')
const plan=JSON.parse(readFileSync(planPath,'utf8'))
const lines=compileAnnotations(plan,loadAssets(plan),{reviewed:process.argv.includes('--reviewed')})
console.log(JSON.stringify({entries:Object.keys(lines).length,annotations:plan.annotations,reviewed:process.argv.includes('--reviewed'),note:'Review phrase and sentence readings in pinyin-review.txt. Corrections belong in the authoring file.'}))
