import {expect,it} from 'vitest'
import {renderToStaticMarkup} from 'react-dom/server'
import {readFileSync} from 'node:fs'
import CartoonActor from './shared/components/CartoonActor'
import MountedActor from './shared/components/MountedActor'
const cast=JSON.parse(readFileSync('public/stories/animated/cast/lms.json','utf8'))
it('keeps Option A attached to shared props and mounted acting without replacing other faces',()=>{
 for(const prop of ['phone','sword','bow','lance']){
  const svg=renderToStaticMarkup(<CartoonActor actorId="Hyun" character={cast.Hyun} prop={prop} emotion="determined" reduced/>)
  expect(svg).toContain('data-weed-design="option-a"')
  expect(svg).toContain(`data-prop="${prop}"`)
  expect(svg).not.toMatch(/NaN|Infinity|<image/)
 }
 const mounted=renderToStaticMarkup(<MountedActor character={cast.Hyun} emotion="determined" reduced active={false} performanceKey={0}/>)
 expect(mounted).toContain('data-weed-design="option-a"')
 expect(mounted).toContain('data-lance="true"')
 const sister=renderToStaticMarkup(<CartoonActor actorId="Sister" character={cast.Sister} emotion="happy" reduced/>)
 expect(sister).not.toContain('data-weed-design')
 expect(sister).toContain('data-refined-face="spirited"')
})
it('uses unique clipping IDs for two simultaneously rendered Weed actors',()=>{
 const svg=renderToStaticMarkup(<><CartoonActor actorId="Hyun" character={cast.Hyun} reduced/><CartoonActor actorId="Hyun" character={cast.Hyun} reduced/></>)
 const ids=[...svg.matchAll(/<clipPath id="([^"]+)"/g)].map(match=>match[1])
 expect(ids).toHaveLength(6)
 expect(new Set(ids).size).toBe(ids.length)
})
