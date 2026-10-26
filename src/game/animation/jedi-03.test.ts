import {it,expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {compileStory,initialStoryState,settleStory,advanceStory,replayStory,type StoryState} from './shared/engine/story-engine.js'
import {evaluateOutcomeScorecard} from './outcomeScorecard'
import {validateChinese,type ChinesePackage} from './package'
const pack=JSON.parse(readFileSync('stories/animated/jedi-03.json','utf8')) as ChinesePackage
it('preserves all inherited outcomes, preparation costs and medical consequences across every route',()=>{
 expect(validateChinese(pack).errors).toEqual([])
 const story=compileStory(pack.script,pack.assets).story;expect(Object.keys(story.variables)).toHaveLength(4)
 let routes=0;const inherited=new Set<string>(),endings=new Set<string>()
 function visit(state:StoryState,steps:(string|null)[],choices:string[]){
  if(state.ended){routes++;const prep=choices.filter(x=>x.startsWith('prep-'));expect(prep).toHaveLength(3);expect(new Set(prep).size).toBe(3);expect(state.variables.preparations).toBe(0)
   const water=4+(['tao-lost','q-lost'].includes(choices[0])?8:choices[0]==='half'?4:0)+(choices.includes('prep-reserve')?4:0)+(choices.includes('pledge')?2:0)-(choices.includes('exclusive')?6:choices.includes('shared')?4:0)-(choices.includes('treat')?4:0)
   expect(state.variables.water).toBe(water);expect(water).toBeGreaterThanOrEqual(0)
   const result=evaluateOutcomeScorecard(pack.outcomeScorecard!,state),alive=choices.includes('prep-evacuate')||choices.includes('treat')
   expect(result.categories[0].score===100).toBe(alive);expect(result.facts.some(x=>x.startsWith('Mei survives'))).toBe(alive)
   if(choices.includes('shared')){expect(choices).toContain('prep-pump');expect(choices).toContain('prep-listen')}
   expect(replayStory(story,JSON.parse(JSON.stringify(steps)),1)).toEqual(state)
   inherited.add(choices.slice(0,2).join('/'));endings.add(choices.find(x=>['shared','exclusive','emergency'].includes(x))!+'/'+alive)
   const activeActors=state.history.filter(h=>h.actor==='Tao'||h.actor==='Q');expect(activeActors).toEqual([])
   return
  }
  const n=story.nodes[state.cursor]
  if(n.type==='choice'){expect(n.options.length).toBeLessThanOrEqual(4);if(n.id.startsWith('prepare-'))for(const o of n.options)expect(choices).not.toContain(o.id)
   for(const o of n.options){if(o.id==='exclusive')expect(Number(state.variables.water)).toBeGreaterThanOrEqual(6);if(['shared','treat'].includes(o.id))expect(Number(state.variables.water)).toBeGreaterThanOrEqual(4);visit(advanceStory(story,state,o.id),[...steps,o.id],[...choices,o.id])}
  }else visit(advanceStory(story,state,null),[...steps,null],choices)
 }
 visit(settleStory(story,initialStoryState(story)),[],[])
 expect(routes).toBe(1224);expect(inherited.size).toBe(8);expect(endings.size).toBe(6)
},30000)
