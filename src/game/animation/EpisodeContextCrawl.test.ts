import {describe,it,expect} from 'vitest'
import {validEpisodeContext} from './EpisodeContextCrawl'
import catalog from '../../../public/stories/animated/catalog.json'
describe('opening context',()=>{
 it('contains exactly three water-series openings with at most two paragraphs',()=>{
 const entries=catalog.filter(e=>e.category==='jedi'&&(e.episode??0)<=3)
 expect(entries).toHaveLength(3)
 for(const e of entries){expect(validEpisodeContext(e.intro?.context)).toBe(true);expect(e.intro?.context?.paragraphs).toHaveLength(2)}
 })
 it('rejects empty or overlong context safely',()=>{
 expect(validEpisodeContext(undefined)).toBe(false)
 expect(validEpisodeContext({title:'Opening',paragraphs:[]})).toBe(false)
 expect(validEpisodeContext({title:'Opening',paragraphs:['a','b','c']})).toBe(false)
 expect(validEpisodeContext({title:'Opening',paragraphs:['']})).toBe(false)
 })
})
