import {createRoot} from 'react-dom/client'
import {useState} from 'react'
import StoryPlayback,{type StoryProgress} from '../../src/game/animation/StoryPlayback'
import '../../src/index.css'
import '../../src/game/game.css'
const pixel=new URLSearchParams(location.search).has('pixel')
const pack=await(await fetch(`/stories/animated/supportive-${pixel?17:18}.json`)).json()
pack.presentation={mode:'reading',layout:'intertitles',animationLabels:[]}
if(!pixel)pack.script+='\n' // Uses the SVG path instead of a registered comic shot.
function Fixture(){
 const [progress,setProgress]=useState<StoryProgress|undefined>(()=>JSON.parse(localStorage.getItem('intertitle-animation')||'null')??undefined)
 return <div className="game-page game-playing"><StoryPlayback pack={pack} reduced initial={progress} preferencesKey="intertitle-animation-options" onProgress={p=>{setProgress(p);localStorage.setItem('intertitle-animation',JSON.stringify(p))}}/></div>
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
