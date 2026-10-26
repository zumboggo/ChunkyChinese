import {it,expect} from 'vitest'
import {renderToStaticMarkup} from 'react-dom/server'
import {readFileSync} from 'node:fs'
import CartoonActor from './shared/components/CartoonActor'
import {EMOTIONS} from './shared/engine/acting-library.js'
const cast=JSON.parse(readFileSync('public/stories/animated/cast/wind.json','utf8'))
it('keeps the approved young Kvothe design through expressions and seated acting',()=>{
 for(const emotion of EMOTIONS){
  const svg=renderToStaticMarkup(<CartoonActor actorId="Kvothe" character={cast.Kvothe} emotion={emotion} rest="seated" reduced/>);
  expect(svg).toContain('data-kvothe-face="troubadour"');expect(svg).toContain('data-kvothe-costume="troubadour"');expect(svg).toContain('data-furniture="stool"');expect(svg).not.toMatch(/NaN|Infinity/);
 }
 const kote=renderToStaticMarkup(<CartoonActor actorId="Kote" character={cast.Kote} reduced/>);
 expect(kote).not.toContain('data-kvothe-face');expect(kote).not.toContain('data-kvothe-costume');
})
