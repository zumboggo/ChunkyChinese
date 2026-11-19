import {describe,it,expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {compileStory,advanceStory,replayStory} from '../shared/engine/story-engine.js'
import {pixelShots} from './direction'
import data from '../../../../pebble/web/assets.json'
for(const episode of [17,18]){
const pack=JSON.parse(readFileSync(`stories/animated/supportive-${episode}.json`,'utf8'))
describe(`episode ${episode} pixel direction`,()=>{
 it('directs every passage on every route using available pixel performances',()=>{
  const story=compileStory(pack.script,pack.assets).story,shots=pixelShots(pack.script,story)!
  expect(shots.size).toBe(story.nodes.filter((n:{type:string})=>['say','act'].includes(n.type)).length)
  for(const shot of shots.values()){
   expect(shot.durationMs).toBeLessThanOrEqual(3000)
   if(shot.scene)expect(data.library.scenes.some(s=>s.id===shot.scene)).toBe(true)
   else expect((data.art as Record<string,number>)[shot.reaction+'-full']).toBeGreaterThanOrEqual(1000)
  }
  let routes=0
  function walk(state:ReturnType<typeof replayStory>){
   if(state.ended){routes++;return}
   const node=story.nodes[state.cursor]
   if(node.type==='choice')for(const o of node.options)walk(advanceStory(story,state,o.id))
   else{expect(shots.has(state.cursor)).toBe(true);walk(advanceStory(story,state,null))}
  }
  walk(replayStory(story,[],1));expect(routes).toBe(16)
 })
 it('never enables the pilot for other episodes or unreviewed script changes',()=>{
  const other=JSON.parse(readFileSync('stories/animated/supportive-16.json','utf8'))
  expect(pixelShots(other.script,compileStory(other.script,other.assets).story)).toBeNull()
  expect(pixelShots(pack.script+'\n',compileStory(pack.script,pack.assets).story)).toBeNull()
 })
})

}
