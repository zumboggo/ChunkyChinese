import {readFileSync,writeFileSync} from 'node:fs'
import {resolve,sep} from 'node:path'
import {compactContinuity} from '../src/game/animation/continuity.ts'
const [input,output]=process.argv.slice(2)
if(!input||!output||!resolve(output).startsWith(resolve('.local')+sep))throw Error('Use INPUT_PLAN OUTPUT_PLAN under .local/. Released episodes are never rewritten.')
const plan=JSON.parse(readFileSync(input,'utf8'));if(!plan.continuity)throw Error('No continuity definition found')
const before=JSON.stringify(plan.continuity).length;plan.continuity=compactContinuity(plan.continuity)
writeFileSync(output,JSON.stringify(plan,null,2)+'\n',{flag:'wx'})
console.log(JSON.stringify({beforeCharacters:before,afterCharacters:JSON.stringify(plan.continuity).length,nodes:plan.continuity.stateGraph.nodes.length,output}))
