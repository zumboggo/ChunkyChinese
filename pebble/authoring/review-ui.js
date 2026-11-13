(()=>{
const $=id=>document.getElementById(id),lib=REVIEW.library,data=REVIEW.ensemble,canvas=$('watch'),ctx=canvas.getContext('2d'),drawClassic=classic(ctx,lib);
const shots=structuredClone(REVIEW.shots||[]);
for(const shot of shots)if(shot.recipe&&!lib.scenes.some(s=>s.id===shot.scene))lib.scenes.push({id:shot.scene,name:shot.scene,group:'Downloadable',nativeId:65535,setting:shot.recipe.setting,ambient:shot.recipe.ambient,recipe:shot.recipe,duration:shot.recipe.keys.at(-1)[0],ensemble:{actor:shot.recipe.actor,gesture:shot.recipe.prop==='cup'?'sip':'listen'}});
let shotIndex=shots.length?0:-1,scene=lib.scenes.find(s=>s.id===shots[0]?.scene)||lib.scenes[0],phase='hold',elapsed=0,ambient=0,holdAt=0,paused=false,last=performance.now(),enter=false;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
$('title').textContent=REVIEW.title||'Pebble recipe catalogue';
const readiness=$('readiness');for(const text of REVIEW.messages||[]){const p=document.createElement('p');p.className='warning';p.textContent=text;readiness.append(p);}
function supported(s){return s.nativeId<=5||(['train','cafe','consulate','home','classroom','trading','street'].includes(s.setting)&&(s.ensemble||s.sample));}
function render(target,s,state,t,a,ambience){
 if(!supported(s)){target.fillStyle='white';target.fillRect(0,0,200,228);return;}
 const renderer=target===ctx?drawClassic:classic(target,lib);
 if(s.nativeId<=5){renderer.draw(s,state,t,ambience?a:0);return;}
 const setting=(s.setting==='cafe'?'meal':s.setting)+(s.ambient==='rain'?'-rain':s.ambient==='cat'?'-cat':'');
 const renderData=s.recipe?{...data,actions:{...data.actions,[s.ensemble.gesture]:{duration:s.duration,keys:s.recipe.keys.map(([t,y,x,h,a])=>[t,y,x,h,a/1000])}}}:data;
 PebbleEnsemble.render(target,renderData,{actor:s.ensemble?.actor||'boe',action:s.ensemble?.gesture||'listen',setting,actionMs:t,ambientMs:a,ambience:ambience&&s.ambient!=='none',ambientKind:s.recipe?s.ambient:undefined,backgroundOnly:!!s.sample});
 if(s.sample)renderer.seated();
}
function draw(){render(ctx,scene,phase,elapsed,ambient,$('ambience').checked);canvas.dataset.phase=phase;canvas.dataset.scene=scene.id;}
function ui(){
 $('scene-name').textContent=scene.name;$('scene-id').textContent=scene.id+' · '+scene.group+' · '+scene.setting;
 $('select').disabled=['playing','establish','unavailable'].includes(phase)||(!shots.length&&phase==='hold');
 $('status').textContent=phase==='unavailable'?'This setting needs native review; browser preview unavailable.':phase==='waiting'?'Waiting for Select':phase==='hold'?'Final pose held · Select for next moment':paused?'Paused':'Playing';
 $('pause').textContent=paused?'Play':'Pause';
}
function start(s){scene=s;phase=!supported(s)?'unavailable':s.action?'establish':'playing';elapsed=ambient=0;paused=reduced||!supported(s);last=performance.now();draw();ui();}
function context(){const shot=shots[shotIndex];$('context').textContent=shot?.passage||'Catalogue demonstration; choose scenes that fit the actual story.';$('anchor').textContent=shot?shot.anchor+' · section '+shot.section:'';$('notes').value=shot?.note||'';$('notes').disabled=!shot;}
function showTab(name){$('shots').hidden=name!=='episode';$('catalogue').hidden=name!=='catalogue';$('episode-tab').classList.toggle('active',name==='episode');$('catalogue-tab').classList.toggle('active',name==='catalogue');}
function shotList(){const list=$('shot-list');list.replaceChildren();shots.forEach((shot,i)=>{const b=document.createElement('button');b.className='shot'+(i===shotIndex?' active':'');b.textContent=(i+1)+'. '+shot.scene+' · '+shot.anchor;b.onclick=()=>{shotIndex=i;context();start(lib.scenes.find(s=>s.id===shot.scene));shotList();};list.append(b);});if(!shots.length)list.textContent='No cues yet. Add stable labels and a direction file, then regenerate this review.';}
const use=document.createElement('button');use.textContent='Use recipe for selected moment';use.id='use-recipe';use.disabled=!shots.length;use.onclick=()=>{shots[shotIndex].scene=scene.id;if(scene.recipe)shots[shotIndex].recipe=structuredClone(scene.recipe);else delete shots[shotIndex].recipe;shotList();showTab('episode');context();};$('scene-id').after(use);
function cards(){const q=$('search').value.toLowerCase(),list=$('cards');list.replaceChildren();for(const s of lib.scenes.filter(s=>[s.id,s.name,s.group,s.setting].join(' ').toLowerCase().includes(q))){const b=document.createElement('button');b.className='card';b.dataset.scene=s.id;const c=document.createElement('canvas');c.width=200;c.height=228;render(c.getContext('2d'),s,'hold',s.duration,0,false);const title=document.createElement('strong');title.textContent=s.group+' · '+s.name;const id=document.createElement('small');id.className='code';id.textContent=s.id;const detail=document.createElement('small');detail.textContent=(!supported(s)?'Native review needed · ':'')+s.setting+' · '+(s.action?'interactive pickup':s.duration/1000+' sec')+(s.recipe?' · downloadable recipe':REVIEW.supported.includes(s.id)?' · recorded runtime':' · new runtime needed');b.append(c,title,id,detail);b.onclick=()=>start(s);list.append(b);}}
function activate(){if(phase==='waiting'){phase='playing';elapsed=0;paused=false;last=performance.now();}else if(phase==='hold'&&performance.now()-holdAt>=lib.holdGuard&&shots.length){shotIndex=(shotIndex+1)%shots.length;context();shotList();start(lib.scenes.find(s=>s.id===shots[shotIndex].scene));}draw();ui();}
$('select').onclick=activate;$('replay').onclick=()=>{start(scene);paused=false;ui();};$('pause').onclick=()=>{paused=!paused;last=performance.now();ui();};$('ambience').onchange=draw;$('large').onchange=()=>canvas.classList.toggle('large',$('large').checked);
$('episode-tab').onclick=()=>showTab('episode');$('catalogue-tab').onclick=()=>showTab('catalogue');$('search').oninput=cards;$('notes').oninput=()=>{if(shots[shotIndex])shots[shotIndex].note=$('notes').value;};
$('download').disabled=!REVIEW.id;$('download').onclick=()=>{const plan={schema:1,episode:REVIEW.id,cues:shots.map(({anchor,scene,note,recipe})=>({anchor,scene,...(recipe?{recipe}:{}),...(note?{note}:{})}))};const url=URL.createObjectURL(new Blob([JSON.stringify(plan,null,2)+'\n'],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=REVIEW.id+'-direction.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
document.addEventListener('keydown',e=>{if(e.key!=='Enter'||['INPUT','TEXTAREA'].includes(e.target.tagName)||(e.target.tagName==='BUTTON'&&e.target!==$('select')))return;e.preventDefault();if(!e.repeat&&!enter){enter=true;activate();}});document.addEventListener('keyup',e=>{if(e.key==='Enter')enter=false;});window.addEventListener('blur',()=>{enter=false;});
setInterval(()=>{const now=performance.now(),dt=Math.min(250,now-last);last=now;if(paused||phase==='unavailable')return;if($('ambience').checked)ambient=(ambient+dt)%lib.ambient.period;if(phase!=='waiting'&&phase!=='hold')elapsed+=dt;if(phase==='establish'&&elapsed>=scene.establish){phase='waiting';elapsed=0;}else if(phase==='playing'&&elapsed>=scene.duration){phase='hold';elapsed=scene.duration;holdAt=now;}if(phase!=='hold'||$('ambience').checked)draw();else if(canvas.dataset.phase!=='hold')draw();ui();},1000/lib.fps);
context();shotList();cards();showTab(shots.length?'episode':'catalogue');start(scene);
})();
