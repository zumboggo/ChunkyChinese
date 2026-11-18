(()=>{
const $=id=>document.getElementById(id),screen=$('screen');
const VN=visualNovel(DATA.config,DATA.resource,DATA.actors,DATA.anims,DATA.sceneIds);
// Parent app supplies account scope without changing the offline URL.
let identity='guest';try{if(parent!==window)identity=parent.document.querySelector('iframe[data-pebble-identity]')?.dataset.pebbleIdentity||'guest';}catch{}
const prefix='pebble-phone:'+identity+':';
const offlineReady='serviceWorker' in navigator?navigator.serviceWorker.register('./service-worker.js').then(()=>navigator.serviceWorker.ready):Promise.reject(new Error('Offline storage is unavailable'));
void offlineReady.catch(()=>{});
let pack,state,frame=0,phase='hold',start=0,scene,canvas,holdUntil=0;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
function message(text){$('status').textContent=text;}
function key(){return prefix+pack.id+':'+pack.version;}
function persist(){try{localStorage.setItem(key(),JSON.stringify(state));localStorage.setItem(prefix+'selected',pack.id);}catch{message('Storage unavailable. Keep this page open to retain your place.');}}
function valid(s){return s&&Number.isInteger(s.node)&&s.node>=0&&s.node<pack.nodes.length&&Number.isInteger(s.phrase)&&s.phrase>=0&&s.phrase<(pack.nodes[s.node].phrases?.length||1);}
function settle(){let count=0;while(pack.nodes[state.node]?.type==='goto'){state.node=pack.nodes[state.node].to;if(++count>pack.nodes.length)throw Error('Invalid story route');}if(!pack.nodes[state.node])throw Error('Missing passage');}
function element(tag,text,cls){const e=document.createElement(tag);e.textContent=text;if(cls)e.className=cls;return e;}
function tick(now){const elapsed=now-start,ctx=canvas.getContext('2d');
 if(scene){const duration=phase==='establish'?scene.establish:scene.duration;const t=reduced?duration:Math.min(elapsed,duration);VN.render(ctx,scene,phase,t,0);if(phase!=='waiting'&&elapsed>=duration){if(phase==='establish'){phase='waiting';$('next').disabled=false;$('next').textContent='Pick up the phone';}else{phase='hold';holdUntil=performance.now()+250;$('next').disabled=false;$('next').textContent='Continue →';}}}
 else{const n=pack.nodes[state.node],id=DATA.art[n.actor+'-'+n.emotion+'-full'];VN.reaction(ctx,id,reduced?12000:elapsed);if(elapsed>=1200){phase='hold';holdUntil=performance.now()+250;$('next').disabled=false;}}
 if(phase==='playing'||phase==='establish')frame=requestAnimationFrame(tick);
}
function render(){cancelAnimationFrame(frame);settle();persist();screen.replaceChildren();screen.className='';scene=null;phase='hold';holdUntil=0;
 const n=pack.nodes[state.node];$('next').disabled=n.type==='choice'||n.type==='end';$('next').hidden=n.type==='choice';$('next').textContent=n.type==='end'?'Episode complete':'Continue →';$('back').disabled=!state.history.length;
 $('position').textContent='Episode '+pack.number+' · passage '+(state.node+1)+' of '+pack.nodes.length+(n.type==='line'?' · phrase '+(state.phrase+1)+' of '+n.phrases.length:'');
 if(n.type==='line'){const p=n.phrases[state.phrase];screen.append(element('p',p.py,'pinyin'),element('p',p.en,'english'),element('p',n.speaker.replace('YoungAlden','Young Alden'),'speaker'));}
 else if(n.type==='choice'){screen.append(element('h2','Choose your response'));const choices=element('div','','choices');n.options.forEach((o,i)=>{const b=element('button',String.fromCharCode(65+i)+' · '+o.phrases.map(p=>p.en).join(' '));b.onclick=()=>advance(o.to);choices.append(b);});screen.append(choices);}
 else if(n.type==='animation'||n.type==='reaction'){screen.className='art';canvas=document.createElement('canvas');canvas.width=200;canvas.height=228;canvas.setAttribute('aria-label',n.type==='reaction'?n.actor+' reacts':'Animated story scene');screen.append(canvas);scene=n.type==='animation'?DATA.library.scenes.find(s=>s.id===n.id):null;phase=scene?.action?'establish':'playing';$('next').disabled=true;start=performance.now();frame=requestAnimationFrame(tick);}
 else if(n.type==='end'){screen.append(element('h2','Episode complete'),element('p','Your place is saved. Choose another episode above whenever you’re ready.'));}
}
function advance(target){if(phase==='waiting'){phase='playing';start=performance.now();$('next').disabled=true;frame=requestAnimationFrame(tick);return;}if(phase!=='hold'||performance.now()<holdUntil)return;const n=pack.nodes[state.node];if(n.type==='end'||(n.type==='choice'&&target===undefined))return;
 state.history.push({node:state.node,phrase:state.phrase});if(target!==undefined){state.node=target;state.phrase=0;}else if(n.type==='line'&&state.phrase+1<n.phrases.length)state.phrase++;else{state.node++;state.phrase=0;}render();}
function open(id){pack=DATA.episodes.find(p=>p.id===id)||DATA.episodes[0];$('episode').value=pack.id;let saved;try{saved=JSON.parse(localStorage.getItem(key()));}catch{}
 state=valid(saved)&&Array.isArray(saved.history)&&saved.history.every(valid)?saved:{node:pack.entry,phrase:0,history:[]};$('sources').replaceChildren(element('p',pack.notice||''));for(const source of pack.sources||[]){const a=element('a',source.title);a.href=source.url;a.target='_blank';a.rel='noopener';$('sources').append(a);}render();}
for(const p of DATA.episodes){const option=element('option',p.number+' · '+p.shortTitle);option.value=p.id;$('episode').append(option);}
$('episode').onchange=()=>open($('episode').value);$('next').onclick=()=>advance();$('back').onclick=()=>{const previous=state.history.pop();if(previous){state.node=previous.node;state.phrase=previous.phrase;render();}};
$('restart').onclick=()=>{if(confirm('Restart this phone reading? Your watch is unaffected.')){state={node:pack.entry,phrase:0,history:[]};render();}};
$('save').onclick=async()=>{const button=$('save');button.disabled=true;message('Saving all three episodes and pixel scenes…');try{await offlineReady;const url=new URL(location.href);url.search='';url.hash='';const response=await fetch(url.href,{cache:'reload'});if(!response.ok)throw Error('Download failed');const cache=await caches.open('chunky-pebble-trip-v1');await cache.put(url.href,response);message('All three episodes saved for offline reading. Open this reader once before going offline.');}catch{message('Could not save for offline use. Reconnect and try again.');}finally{button.disabled=false;}};
document.addEventListener('keydown',e=>{if(e.repeat||['SELECT','INPUT','BUTTON'].includes(e.target.tagName))return;const n=pack.nodes[state.node];if((e.key==='1'||e.key==='2')&&n.type==='choice'){e.preventDefault();const o=n.options[Number(e.key)-1];if(o)advance(o.to);}else if(e.key==='Enter'||e.key==='ArrowRight'||e.key===' '){e.preventDefault();advance();}else if(e.key==='ArrowLeft'){e.preventDefault();$('back').click();}});
let selected;try{selected=localStorage.getItem(prefix+'selected');}catch{}open(selected);
})();
