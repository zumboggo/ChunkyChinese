import {it,expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {compileStory,initialStoryState,settleStory,advanceStory,replayStory,type StoryState} from './shared/engine/story-engine.js'
import {playbackScript} from './storage'
const read=(name:string)=>JSON.parse(readFileSync('stories/animated/'+name+'.json','utf8'))
const catalog=JSON.parse(readFileSync('public/stories/animated/catalog.json','utf8'))
for(const entry of [...catalog,{id:'demo',path:'gate-in-the-mist.json'}])it(`${entry.id}: every named speaker is staged and framed on every route`,()=>{
 const p=read(entry.path.replace('.json','')),{story}=compileStory(p.script,p.assets)
 function walk(state:StoryState,depth=0){expect(depth).toBeLessThan(150);if(state.ended)return;const n=story!.nodes[state.cursor]
  if(n.type==='say'&&n.actor!=='I'){expect(state.stage.actors,n.text).toHaveProperty(n.actor);if(['medium','close'].includes(state.stage.camera?.shot??'')&&state.stage.camera?.actor)expect(state.stage.camera.actor,n.text).toBe(n.actor)}
  if(n.type==='choice')for(const o of n.options)walk(advanceStory(story!,state,o.id),depth+1);else walk(advanceStory(story!,state,null),depth+1)
 }walk(settleStory(story!,initialStoryState(story!,1)))
})
for(const [from,to] of [['jedi-01','jedi-01-v2'],['moonlight-01-v3','moonlight-01-v4'],['moonlight-02-v3','moonlight-02-v4'],['moonlight-03-v2','moonlight-03-v3']])it(`${to}: preserves audio, choices and resume at every step`,()=>{
 const old=read(from),next=read(to),a=compileStory(old.script,old.assets).story!,b=compileStory(next.script,next.assets).story!
 expect(next.chinese).toEqual(old.chinese);expect(next.quiz).toEqual(old.quiz);expect(next.assets).toEqual(old.assets);expect(playbackScript(next.script)).toBe(playbackScript(old.script))
 function walk(state:StoryState,steps:(string|null)[]){const resumed=replayStory(b,steps,19);expect(resumed.ended).toBe(state.ended);expect(resumed.history).toEqual(state.history);expect(resumed.variables).toEqual(state.variables);if(state.ended)return
  const n=a.nodes[state.cursor],m=b.nodes[resumed.cursor];expect(JSON.parse(JSON.stringify(m,(key,value)=>key==='line'?undefined:value))).toEqual(JSON.parse(JSON.stringify(n,(key,value)=>key==='line'?undefined:value)))
  if(n.type==='choice')for(const o of n.options)walk(advanceStory(a,state,o.id),[...steps,o.id]);else walk(advanceStory(a,state,null),[...steps,null])
 }walk(settleStory(a,initialStoryState(a,19)),[])
})
