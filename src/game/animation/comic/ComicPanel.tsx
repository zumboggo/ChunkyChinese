import sheets from './sheets.json'
import type {PixelShot} from '../pixel/direction'
import './comic-panel.css'

/** One crop from a six-panel sheet; text and accessibility remain native UI. */
export default function ComicPanel({shot}:{shot:NonNullable<PixelShot['comic']>}){
 const src=(sheets as Record<string,string>)[shot.sheet]
 if(!src)throw Error('Missing comic sheet: '+shot.sheet)
 const columns=shot.columns===3?3:2,rows=6/columns
 return <div className="comic-panel" role="img" aria-label={shot.alt} data-comic-panel={`${shot.sheet}:${shot.panel}`} style={{aspectRatio:shot.aspectRatio??1.5,backgroundImage:`url(${src})`,backgroundSize:`${columns*100}% ${rows*100}%`,backgroundPosition:`${shot.panel%columns*100/(columns-1)}% ${Math.floor(shot.panel/columns)*100/(rows-1)}%`}}/>
}
