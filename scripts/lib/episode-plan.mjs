import assert from 'node:assert/strict'
import {compileStory,initialStoryState,settleStory,advanceStory,replayStory} from '../../src/game/animation/shared/engine/story-engine.js'

// One deterministic route model is shared by authoring checks and browser previews.
export function episodeRoutes(pack){
 const {story,errors}=compileStory(pack.script,pack.assets)
 if(errors.length)throw Error(JSON.stringify(errors))
 if(story.nodes.some(n=>n.type==='chance'))throw Error('Chance needs an explicitly authored outcome audit.')
 const routes=[]
 function visit(state,steps,choices,beats){
  if(steps.length>2000||routes.length>=4096)throw Error('Episode exceeds route/step limits.')
  assert.deepEqual(replayStory(story,steps,1),state,'Resume replay differs')
  if(state.ended){routes.push({choices,beats});return}
  const n=story.nodes[state.cursor]
  if(n.type==='choice')for(const o of n.options)visit(advanceStory(story,state,o.id),[...steps,o.id],[...choices,o.id],[...beats,{type:'choice',id:n.id,option:o.id,text:o.text}])
  else visit(advanceStory(story,state,null),[...steps,null],choices,[...beats,{type:n.type,text:n.text}])
 }
 visit(settleStory(story,initialStoryState(story,1)),[],[],[])
 return routes
}
export function checkRouteExpectations(routes,expectations){
 if(!Array.isArray(expectations)||!expectations.length)throw Error('Add source events and callbacks to the plan routes.')
 const selected=[]
 for(const e of expectations){
  const r=routes.find(r=>JSON.stringify(r.choices)===JSON.stringify(e.choices))
  if(!r)throw Error('Unreachable choices: '+JSON.stringify(e.choices))
  if(!Array.isArray(e.contains)||!e.contains.length||!e.endsWith)throw Error('Each route needs contains and endsWith source assertions.')
  const texts=r.beats.filter(b=>b.type!=='choice').map(b=>b.text)
  for(const t of e.contains)assert(texts.includes(t),'Missing expected source event/callback: '+t)
  assert.equal(texts.at(-1),e.endsWith,'Unexpected ending')
  if(selected.includes(r))throw Error('Duplicate planned route')
  selected.push(r)
 }
 if(routes.length>1&&selected.length<2)throw Error('Plan at least two contrasting browser routes.')
 return selected
}

/** Cover every reachable authored beat/option, while avoiding redundant cross-products.
 * Stateful stories remain exhaustive: text coverage cannot prove variable behavior. */
export function selectBrowserRoutes(routes,pack,{all=false}={}){
 if(all||pack.continuity||pack.outcomeScorecard||/^\s*(variable|set|inc|dec|add|roll|if|chance)\b/m.test(pack.script))return routes
 const keys=r=>new Set(r.beats.map(b=>JSON.stringify([b.type,b.id,b.option,b.text])))
 const remaining=new Set(routes.flatMap(r=>[...keys(r)])),selected=[]
 while(remaining.size){
  const best=routes.filter(r=>!selected.includes(r)).map(r=>({r,score:[...keys(r)].filter(k=>remaining.has(k)).length})).sort((a,b)=>b.score-a.score)[0]
  if(!best?.score)throw Error('Browser route coverage is incomplete')
  selected.push(best.r);for(const k of keys(best.r))remaining.delete(k)
 }
 if(routes.length>1&&selected.length<2)selected.push(routes.find(r=>r!==selected[0]))
 return selected
}
