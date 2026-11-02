import {it,expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {episodeRoutes,checkRouteExpectations,checkSpeakerStaging} from './episode-plan.mjs'
const pack=JSON.parse(readFileSync('stories/animated/moonlight-05.json','utf8'))
it('enumerates four replay-safe paths and catches invented source events and paths',()=>{
 const routes=episodeRoutes(pack);expect(routes).toHaveLength(4)
 const fixtures=[routes[0],routes.at(-1)].map(r=>({choices:r.choices,contains:[r.beats[0].text],endsWith:r.beats.at(-1).text}))
 expect(checkRouteExpectations(routes,fixtures)).toHaveLength(2)
 expect(()=>checkRouteExpectations(routes,[fixtures[0]])).toThrow('contrasting')
 expect(()=>checkRouteExpectations(routes,[{...fixtures[0],choices:['invented']}])).toThrow('Unreachable')
 expect(()=>checkRouteExpectations(routes,[{...fixtures[0],contains:['invented event']},fixtures[1]])).toThrow('Missing expected')
 expect(()=>checkRouteExpectations(routes,[{...fixtures[0],endsWith:'invented ending'},fixtures[1]])).toThrow('Unexpected ending')
})

it('catches a speaker lost only on a choice branch, while accepting deliberate listener shots',()=>{
 const assets=JSON.parse(readFileSync('stories/animated/supportive-07.json','utf8')).assets
 const script=`story 2
scene kitchen
show Alden neutral left
show Hannah worried right
camera listener Hannah cut
Alden: 我来了。
choice route
option stay "留在这里。" -> stay
option call "打电话。" -> call
label call
scene restaurant
show Hannah worried right
goto join
label stay
I: 好。
label join
Alden: 你听到了吗？
end
`
 expect(()=>episodeRoutes({script,assets})).toThrow(/Speaker Alden is not staged.*route call/)
 expect(episodeRoutes({script:script.replace('show Hannah worried right\ngoto join','show Hannah worried right\nshow Alden neutral left\ngoto join'),assets})).toHaveLength(2)
 const state={stage:{actors:{Alden:{},Hannah:{}},camera:{shot:'close',actor:'Hannah'}}}
 expect(()=>checkSpeakerStaging(state,{type:'say',actor:'Alden',text:'Hello',line:3})).toThrow('framed on Hannah')
 state.stage.camera.shot='listener'
 expect(()=>checkSpeakerStaging(state,{type:'say',actor:'Alden',text:'Hello',line:3})).not.toThrow()
})
