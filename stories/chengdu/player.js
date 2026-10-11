/* Presentation only. The parent owns identity, validation, audio and local saves. */
Config.history.maxStates = 1;
Config.history.controls = false;
Config.saves.isAllowed = () => false;
Config.ui.stowBarInitially = true;
Config.passages.nobr = true;
const channel = new URLSearchParams(location.hash.slice(1)).get('channel');
let snapshot = null;
let pending = false;
let order = [];
let settingsOpen = false;
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
  if(a.paragraph>=scene.paragraphs.length){const moment=el('details');moment.append(el('summary','Recall this moment'),el('p',scene.paragraphs.join(' ')));panel.append(moment)}
  else {const sr=el('div',scene.paragraphs.join(' '),'sr-only');panel.append(sr);
  scene.paragraphs.slice(0,a.paragraph+1).forEach(t=>{const p=el('p',t);p.setAttribute('aria-hidden','true');panel.append(p)})}
  if(a.paragraph<scene.paragraphs.length) {
    panel.append(button('Next',()=>act('reveal'),'next'),button('Show all',()=>act('showAll'),'showAll'));root.append(panel);return;
  }
  if(scene.promptMode==='listen' && !a.transcript && !a.solved){
    const listen=el('section',undefined,'listening-prompt');listen.append(el('p','Listen closely…','chinese'),button(a.heard?'▶ Replay':'▶ Listen',()=>speak(scene.line.audio),'hear'),button('Show transcript',()=>act('transcript'),'transcript'));
    listen.append(el('p',a.heard?'Choose the reply that fits. You can replay as often as you like.':'Listen to the full question, then choose a reply. Or use Show transcript for support.'));panel.append(listen);
  } else zhLine(scene.line,panel);
  const settings=el('details',undefined,'settings');settings.open=settingsOpen;settings.ontoggle=()=>{settingsOpen=settings.open};settings.append(el('summary','Game settings'),button(a.pinyin?'Pinyin: on':'Pinyin: off',()=>act('pinyin'),'pinyin'),button(a.clues?'English clues: on':'English clues: off',()=>act('clues'),'clues'));panel.append(settings);
  if(a.clues)panel.append(el('p',scene.clue,'goal-clue'));
  else if(!a.solved && scene.kind==='choice')panel.append(button('Hint',()=>act('hint'),'hint'));
  const recall=el('div');
  a.results.forEach((r,i)=>{const s=ep.scenes[i],c=s.choices.find(c=>c.id===r.choiceId);recall.append(el('p',`${s.line.zh} — ${c[a.variant].chunks.join('')}`),el('p',c.responseLine?.zh||c.response))});
  if(!a.results.length)recall.append(el('p',scene.paragraphs.join(' ')));
  if(scene.kind==='choice') {
    const responses=el('div',undefined,'reply-options');
    order.forEach((id,pos)=>{const option=scene.options[id];if(!option)return;const card=el('div',undefined,'reply-option');const b=button('',()=>act('answer',{choiceId:option.id}),`option-${id}`);b.disabled=a.solved||(scene.promptMode==='listen'&&!a.heard&&!a.transcript);b.dataset.shortcut=hotkeys[pos]||String(pos+1);b.append(el('small',String(pos+1)),el('span',option[a.variant],'chinese'));b.lang='zh-CN';if(a.pinyin)b.append(el('span',option[`${a.variant}Pinyin`],'pinyin'));card.append(b,button('▶',()=>speak(option[`${a.variant}Audio`]),`listen-${id}`));card.lastChild.setAttribute('aria-label',`Hear response ${pos+1}`);responses.append(card)});panel.append(responses);
  } else if(c) {
    const answer=c[a.variant], chunks=[...answer.chunks,...(answer.distractors||[])], pinyin=[...answer.pinyin,...(answer.distractorPinyin||[])];
    const selected=el('div',undefined,'sentence');selected.setAttribute('aria-label','My sentence');
    a.tiles.forEach((id,pos)=>{const b=button(chunks[id],()=>act('remove',{index:pos}),`remove-${pos}`);b.lang='zh-CN';b.disabled=a.solved;b.setAttribute('aria-label',`Remove ${chunks[id]}`);selected.append(b)});
    if(!a.tiles.length)selected.append(el('span','Tap chunks below to build your reply.','empty'));panel.append(selected);
    const bank=el('div',undefined,'chunks');bank.setAttribute('aria-label','Available chunks');
    order.forEach((id,pos)=>{const b=button('',()=>act('tile',{index:id}),`tile-${id}`);b.disabled=a.tiles.includes(id)||a.solved;b.dataset.shortcut=hotkeys[pos]||String(pos+1);b.append(el('small',String(pos+1)),el('span',chunks[id]));b.lang='zh-CN';if(a.pinyin)b.append(el('small',pinyin[id]));bank.append(b)});panel.append(bank);
    const controls=el('div',undefined,'controls');
    if(!a.solved) {
      controls.append(button('Undo',()=>act('undo'),'undo'),button('Clear',()=>act('clear'),'clear'),button('Hint',()=>act('hint'),'hint'),button('Check',()=>act('check'),'check'));
      if(a.errors>=2)controls.append(button('Show worked answer',()=>act('model'),'model'));
    }
    panel.append(controls);
    panel.append(el('small','Choose only the chunks you need. Extra chunks can stay in the bank.','keyboard-help'));
  }
  if(a.feedback){const f=el('p',a.feedback,'feedback');f.setAttribute('role','status');panel.append(f)}
  if(a.solved && c){
    const answer=c[a.variant], response=el('section',undefined,'response');
    if(c.responseLine){response.lang='zh-CN';response.append(el('p',c.responseLine.zh,'chinese'));if(a.pinyin)response.append(el('p',c.responseLine.pinyin,'pinyin'));response.append(button('▶ Hear their reply',()=>speak(c.responseLine.audio),'response-audio'));if(a.meaning)response.append(el('p',c.responseLine.english));}
    panel.append(response,button('▶ Hear my reply',()=>speak(answer.audio),'reply'),button(a.step===ep.scenes.length-1?'Finish episode':'Continue',()=>act('next'),'continue'));
  }
  const more=el('details');more.append(el('summary','Recall the conversation'),recall);panel.append(more);
  root.append(panel);
}
Macro.add('chengduScene',{handler:function(){const root=el('main',undefined,'chengdu');this.output.append(root);render(root)}});
window.addEventListener('message',event=>{
  const m=event.data;
  if(event.source!==parent||event.origin!==location.origin||m?.protocol!=='chunky-game-v1'||m.channel!==channel||m.type!=='state'||!m.state||m.state.episodeId!==setup.episode.id||m.state.version!==setup.episode.version)return;
  pending=false;
  const before=snapshot;
  snapshot=m.state;
  order=Array.isArray(m.order)?m.order:[];
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
