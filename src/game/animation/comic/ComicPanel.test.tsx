import {it,expect} from 'vitest'
import {renderToStaticMarkup} from 'react-dom/server'
import ComicPanel from './ComicPanel'

it('shows the top-right panel of a three-column sheet without changing legacy two-column crops',()=>{
 const modern=renderToStaticMarkup(<ComicPanel shot={{sheet:'supportive-25-1',panel:2,columns:3,aspectRatio:1,alt:'Phone close-up'}}/> )
 expect(modern).toContain('background-size:300% 200%')
 expect(modern).toContain('background-position:100% 0%')
 const legacy=renderToStaticMarkup(<ComicPanel shot={{sheet:'supportive-24-1',panel:2,alt:'Legacy panel'}}/> )
 expect(legacy).toContain('background-size:200% 300%')
 expect(legacy).toContain('background-position:0% 50%')
})
