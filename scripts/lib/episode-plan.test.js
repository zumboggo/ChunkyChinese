import {it,expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {episodeRoutes,checkRouteExpectations} from './episode-plan.mjs'
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
