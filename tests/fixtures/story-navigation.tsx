import {createRoot} from 'react-dom/client';
import {useState} from 'react';
import StoryPlayback,{type StoryProgress} from '../../src/game/animation/StoryPlayback';
const pack=await (await fetch('/stories/animated/moonlight-14.json')).json();
const actor=Object.keys(pack.assets.characters)[0],background=Object.keys(pack.assets.backgrounds)[0];
pack.script=`story 2
scene ${background}
show ${actor} neutral center
${actor}: Opening beat.
choice route
option left "Take the left path." -> left
option right "Take the right path." -> right
label left
${actor}: Left path beat.
goto finish
label right
${actor}: Right path beat.
label finish
end`;
pack.quiz=[];
function Fixture(){
 const [progress,setProgress]=useState<StoryProgress>(()=>JSON.parse(localStorage.getItem('navigation-test')||'null')||{steps:[],quizzes:[],seed:19});
 return <><StoryPlayback pack={pack} initial={progress} onProgress={p=>{setProgress(p);localStorage.setItem('navigation-test',JSON.stringify(p))}}/><output data-testid="progress">{JSON.stringify(progress)}</output></>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
