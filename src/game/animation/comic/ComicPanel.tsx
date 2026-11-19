import sheets from './sheets.json'
import type {PixelShot} from '../pixel/direction'
import './comic-panel.css'

/** One crop from a six-panel sheet; text and accessibility remain native UI. */
export default function ComicPanel({shot}:{shot:NonNullable<PixelShot['comic']>}){
 const src=(sheets as Record<string,string>)[shot.sheet]
 if(!src)throw Error('Missing comic sheet: '+shot.sheet)
 return <div className="comic-panel" role="img" aria-label={shot.alt} data-comic-panel={`${shot.sheet}:${shot.panel}`} style={{aspectRatio:shot.aspectRatio??1.5,backgroundImage:`url(${src})`,backgroundPosition:`${shot.panel%2*100}% ${Math.floor(shot.panel/2)*50}%`}}/>
}
