/* Presentation only. The parent owns identity, validation, audio and local saves. */
Config.history.maxStates = 1;
Config.history.controls = false;
Config.saves.isAllowed = () => false;
Config.ui.stowBarInitially = true;
Config.passages.nobr = true;
const channel = new URLSearchParams(location.hash.slice(1)).get('channel');
let snapshot = null;
let pending = false;
let hotkeys = ['1','2','3','4','5','6'];
let playKey = 'p';
const characters = {lin:['Ms Lin · my neighbour',0],chen:['Chen · my colleague',1],zhou:['Ms Zhou · teahouse owner',2]};
function send(type, payload = {}) {
  if (parent === window || !channel) return;
  parent.postMessage({protocol:'chunky-game-v1',channel,type,...payload},location.origin);
}
function act(type, extra = {}) { if(pending)return;pending=true;send('action',{revision:snapshot.revision,action:{type,...extra}}); }
function el(tag, text, cls) { const n=document.createElement(tag); if(text!==undefined)n.textContent=text; if(cls)n.className=cls; return n; }
function button(label, fn, key) { const b=el('button',label); b.type='button'; b.onclick=fn; if(key)b.dataset.key=key; return b; }
function speak(audio) { if(audio)send('audio',{audio}); }
function zhLine(line, root) {
  const p=el('p',line.zh,'chinese'); p.lang='zh-CN'; root.append(p);
  if(snapshot.pinyin)root.append(el('p',line.pinyin,'pinyin'));
  root.append(button('▶ Hear Mandarin',()=>speak(line.audio),'hear'));
  root.append(button(snapshot.meaning?'Hide meaning':'Show meaning',()=>act('meaning'),'meaning'));
  if(snapshot.meaning)root.append(el('p',line.english,'translation'));
}
function render(root) {
  root.replaceChildren();
  if (!snapshot) { root.append(el('p',parent===window?'Open this episode from Game in Chunky Chinese to save your progress.':'Opening your conversation…')); return; }
  const a=snapshot, ep=setup.episode, scene=ep.scenes[a.step];
  if(!scene) {
    root.append(el('p','EPISODE COMPLETE','eyebrow'),el('h1','Things I can now say'),el('p',ep.ending));
    a.results.forEach((r,i)=>{const c=ep.scenes[i].choices.find(c=>c.id===r.choiceId),ans=c[a.variant];const card=el('section',undefined,'receipt');const line=el('p',ans.chunks.join(''),'chinese');line.lang='zh-CN';card.append(line,el('p',ans.english),el('small',r.independent?'Independently':'With support'),button('▶ Hear my sentence',()=>speak(ans.audio)));root.append(card)});
    root.append(el('p','Recognition guides difficulty; these conversations do not change your flashcard ratings.'),button('Back to Game',()=>send('exit'),'exit'));
    return;
  }
  const char=characters[scene.speaker];
  const c=scene.choices.find(c=>c.id===a.choiceId);
  const art=el('div',undefined,'scene-art');
  const portrait=el('img',undefined,'portrait');portrait.src='characters.webp';portrait.alt='';portrait.style.setProperty('--person',char[1]);portrait.onerror=()=>portrait.remove();
  // A clipped atlas shows only the current interlocutor, with their name as fallback.
  const crop=el('div',undefined,'portrait-crop');crop.append(portrait);art.append(crop,el('span',ep.place,'place'));root.append(art);
  const panel=el('section',undefined,'dialogue');
  panel.append(el('p',`${a.step+1} / ${ep.scenes.length} · ${char[0]}`,'eyebrow'));
  const heading=el('h1',scene.title);heading.tabIndex=-1;panel.append(heading);
  if(scene.callback && a.callbacks.includes(scene.callback.flag))panel.append(el('p',scene.callback.text,'callback'));
  // Assistive technology gets the full narrative immediately; visual pacing is optional.
  if(c){const moment=el('details');moment.append(el('summary','Recall this moment'),el('p',scene.paragraphs.join(' ')));panel.append(moment)}
  else {const sr=el('div',scene.paragraphs.join(' '),'sr-only');panel.append(sr);
  scene.paragraphs.slice(0,a.paragraph+1).forEach(t=>{const p=el('p',t);p.setAttribute('aria-hidden','true');panel.append(p)})}
  if(a.paragraph<scene.paragraphs.length) {
    panel.append(button('Next',()=>act('reveal'),'next'),button('Show all',()=>act('showAll'),'showAll'));root.append(panel);return;
  }
  zhLine(scene.line,panel);
  panel.append(button(a.pinyin?'Pinyin: on':'Pinyin: off',()=>act('pinyin'),'pinyin'));
  const aside=el('section',undefined,'aside');aside.append(button(scene.aside.question,()=>act('aside'),'aside'));if(a.aside)aside.append(el('p',scene.aside.answer));if(!c)panel.append(aside);
  const recall=el('details');recall.append(el('summary','Recall the conversation'));
  a.results.forEach((r,i)=>{const s=ep.scenes[i],c=s.choices.find(c=>c.id===r.choiceId);recall.append(el('p',`${s.line.zh} — ${c[a.variant].chunks.join('')}`),el('p',c.response))});
  if(!a.results.length)recall.append(el('p',scene.paragraphs.join(' ')));if(!c)panel.append(recall);
  if(!c) {
    panel.append(el('h2','What do I want to say?'));
    scene.choices.forEach((choice,i)=>{const b=button(`${i+1}. ${choice.label}`,()=>act('choose',{choiceId:choice.id}),`choice-${i}`);b.dataset.shortcut=hotkeys[i];panel.append(b)});
  } else {
    const answer=c[a.variant];
    panel.append(el('h2',c.label),el('p',answer.english,'intention'));
    const selected=el('div',undefined,'sentence');selected.setAttribute('aria-label','My sentence');
    a.tiles.forEach((id,pos)=>{const b=button(answer.chunks[id],()=>act('remove',{index:pos}),`remove-${pos}`);b.lang='zh-CN';b.disabled=a.solved;b.setAttribute('aria-label',`Remove ${answer.chunks[id]}`);selected.append(b)});
    if(!a.tiles.length)selected.append(el('span','Tap chunks below to build your reply.','empty'));panel.append(selected);
    const bank=el('div',undefined,'chunks');bank.setAttribute('aria-label','Available chunks');
    const order=answer.chunks.map((_,i)=>i).reverse();
    order.forEach((id,pos)=>{const b=button('',()=>act('tile',{index:id}),`tile-${id}`);b.disabled=a.tiles.includes(id)||a.solved;b.dataset.shortcut=hotkeys[pos];b.append(el('small',String(pos+1)),el('span',answer.chunks[id]));b.lang='zh-CN';if(a.pinyin)b.append(el('small',answer.pinyin[id]));bank.append(b)});panel.append(bank);
    const controls=el('div',undefined,'controls');
    if(!a.solved) {
      controls.append(button('Undo',()=>act('undo'),'undo'),button('Clear',()=>act('clear'),'clear'),button('Hint',()=>act('hint'),'hint'),button('Check',()=>act('check'),'check'));
      if(a.errors>=2)controls.append(button('Show worked answer',()=>act('model'),'model'));
    }
    panel.append(controls);
    if(a.feedback){const f=el('p',a.feedback,'feedback');f.setAttribute('role','status');panel.append(f)}
    if(a.solved){panel.append(el('p',c.response,'response'),button('▶ Hear my reply',()=>speak(answer.audio),'reply'),button(a.step===ep.scenes.length-1?'Finish episode':'Continue',()=>act('next'),'continue'))}
    panel.append(el('small','Keys 1–5 choose chunks. Tab moves between controls. P replays the speaker.','keyboard-help'));
  }
  if(c){const more=el('details');more.append(el('summary','More conversation & recall'),aside,recall);panel.append(more)}
  root.append(panel);
}
Macro.add('chengduScene',{handler:function(){const root=el('main',undefined,'chengdu');this.output.append(root);render(root)}});
window.addEventListener('message',event=>{
  const m=event.data;
  if(event.source!==parent||event.origin!==location.origin||m?.protocol!=='chunky-game-v1'||m.channel!==channel||m.type!=='state'||!m.state||m.state.episodeId!==setup.episode.id||m.state.version!==setup.episode.version)return;
  pending=false;
  const before=snapshot;
  snapshot=m.state;
  if(Array.isArray(m.hotkeys))hotkeys=m.hotkeys;
  if(typeof m.playKey==='string')playKey=m.playKey;
  const passage=snapshot.step===setup.episode.scenes.length?'Ending':`Scene${snapshot.step+1}`;
  const focusKey=document.activeElement?.dataset?.key;
  if(State.passage!==passage)Engine.play(passage);
  else {const root=document.querySelector('.chengdu');if(root)render(root)}
  if(before && (before.step!==snapshot.step || (!before.choiceId && snapshot.choiceId)))window.scrollTo(0,0);
  if(before){const controls=Array.from(document.querySelectorAll('button'));const focus=controls.find(b=>b.dataset.key===focusKey&&!b.disabled)||controls.find(b=>b.dataset.key==='continue')||controls.find(b=>b.dataset.shortcut&&!b.disabled)||document.querySelector('h1');focus?.focus({preventScroll:true})}
});
window.addEventListener('keydown',event=>{
  if(event.ctrlKey||event.metaKey||event.altKey||event.repeat||!snapshot)return;
  if(event.key.toLowerCase()===playKey.toLowerCase()){event.preventDefault();speak(setup.episode.scenes[snapshot.step]?.line.audio);return}
  const b=Array.from(document.querySelectorAll('button[data-shortcut]')).find(b=>b.dataset.shortcut?.toLowerCase()===event.key.toLowerCase()&&!b.disabled);
  if(b){event.preventDefault();b.click()}
});
$(document).one(':storyready',()=>send('ready'));
