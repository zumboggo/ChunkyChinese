import Debug from 'debug';
import {beginRun,completionEvent,enqueue,acknowledge} from './completion';
import graphics from './native';
import Poco from 'commodetto/Poco';
import Button from 'pebble/button';
import Message from 'pebble/message';

import bundled from './bundled';
import legacy from './legacy';
import upgrade from './upgrade';
import {sceneIds,sceneNames,sceneGroups} from './scenes';
import glyphs from './glyphs';
import art from './art';
import {initial,current,phrase,advance,previous,browse,restore,toggleChinese,migrate,migrateLegacy} from './reader';
import {pages,wrap} from './layout';
import {Transfer,validate,checksum} from './transfer';
import {openWire} from './wire';

const render=new Poco(screen);
const fonts={py:new render.Font(art['font-latin-24']),en:new render.Font(art['font-latin-20']),zh:new render.Font(art['font-chinese-28']),small:new render.Font('Gothic-Regular',14)};
const ink=render.makeColor(0,0,0),paper=render.makeColor(255,255,255),navy=render.makeColor(0,0,85),teal=render.makeColor(0,85,85),grey=render.makeColor(85,85,85);
function readFile(path){const f=device.files.openFile({path});try{return String.fromArrayBuffer(f.read(f.status().size,0));}finally{f.close();}}
function writeFile(path,text){try{device.files.delete(path);}catch{}const bytes=ArrayBuffer.fromString(text);const f=device.files.openFile({path,mode:'r+',size:bytes.byteLength});try{f.write(bytes,0);}finally{f.close();}}
function openStored(path,expected){
 const f=device.files.openFile({path});try{return openWire(f.status().size,(offset,count)=>String.fromArrayBuffer(f.read(count,offset)),expected,(offset,count)=>{const file=device.files.openFile({path});try{return String.fromArrayBuffer(file.read(count,offset));}finally{file.close();}},true);}finally{f.close();}
}
function loadRecipe(wire,play){
 if(typeof wire!=='string'||wire.length>512||!/^\d+(?:,-?\d+)*$/.test(wire))return 0;
 let start=0,index=0;
 for(let i=0;i<=wire.length;i++)if(i===wire.length||wire.charCodeAt(i)===44){
  const value=Number(wire.slice(start,i));if(!Number.isInteger(value)||Math.abs(value)>12000||index>=46||!graphics.recipeData(index++,value))return 0;start=i+1;
 }
 return graphics.recipeData(46,play);
}
const hasArt=name=>!!art[name]||!!art[name+'-full'];
let pack=bundled,activeSlot=localStorage.getItem('activeEpisode');
try{if(activeSlot){pack=openStored('episode-'+activeSlot);validate(pack,glyphs,hasArt,r=>loadRecipe(r,0));}}catch(e){console.log('Using bundled episode',e.message);pack=bundled;activeSlot=null;}
console.log('Episode opened');Debug.gc();
let state=initial(pack),saveGeneration=0,upgraded=false;
// Two generations allow recovery if power is lost while the newest save is written.
console.log('Reading saves');const saves=[];
for(const slot of [0,1]){try{const raw=readFile('progress-'+slot),match=raw.match(/^\{"generation":(\d+),/);if(match)saves.push({path:'progress-'+slot,generation:Number(match[1])});}catch{}Debug.gc();}
saves.sort((a,b)=>b.generation-a.generation);
let archivedId="";
for(const candidate of saves){try{let raw=readFile(candidate.path);const h=raw.indexOf('"history":['),end=raw.indexOf(']',h);if(h>=0&&end-h>800)raw=raw.slice(0,h)+'"history":[]'+raw.slice(end+1);const saved=JSON.parse(raw);if(saved.state.id!==pack.id&&saved.state.id!==archivedId&&/^[a-z0-9-]+$/.test(saved.state.id)){writeFile('saved-'+saved.state.id,JSON.stringify(saved.state));archivedId=saved.state.id;}if(saved.state.id===pack.id&&saved.state.version===pack.version){state=restore(pack,saved.state);saveGeneration=saved.generation;break;}else if(saved.state.id===upgrade.id&&saved.state.version===upgrade.version&&pack.version===upgrade.target){state=migrateLegacy(pack,saved.state,upgrade);saveGeneration=saved.generation;upgraded=true;break;}else if(saved.state.id===legacy.id&&saved.state.version===legacy.version&&pack.version===legacy.target){state=migrateLegacy(pack,saved.state,legacy);saveGeneration=saved.generation;upgraded=true;break;}}catch{}Debug.gc();}
if(localStorage.getItem('readerRevision')!=='3'&&pack.id===bundled.id&&pack.version!==bundled.version){state=pack.version===legacy.version?migrateLegacy(bundled,state,legacy):migrate(pack,bundled,state);upgraded=true;pack=bundled;activeSlot=null;localStorage.removeItem('activeEpisode');}
localStorage.setItem('readerRevision','3');
Debug.gc();
console.log('Save restored',state.n);let overlay=null,menuIndex=0,helpPage=0,status='Available offline',connected=false,sending=false,queued=[],lastImage=null,lastImageName=null,activeScene=0,previewScene=0;
function save(){try{saveGeneration++;writeFile('progress-'+(saveGeneration%2),JSON.stringify({generation:saveGeneration,state:{...state,history:state.history.slice(-24)}}));}catch(e){status='Save failed - keep app open';console.log('SAVE ERROR',e.message);}}
if(upgraded)save();
function pendingCredits(){try{return JSON.parse(localStorage.getItem('episodeCredits')||'[]');}catch{return [];}}
function storeCredits(events){localStorage.setItem('episodeCredits',JSON.stringify(events));}
function creditCompletion(){const event=completionEvent(pack,state);if(event&&state.credited!==event.id){storeCredits(enqueue(pendingCredits(),event));save();syncCredits();}}
function syncCredits(){const first=pendingCredits()[0];if(first&&connected)send({COMMAND:'CREDIT',DATA:JSON.stringify(first)});}

function measure(text,kind){return render.getTextWidth(text,fonts[kind]);}
function text(t,x,y,kind='en',color=ink){render.drawText(t,fonts[kind],color,x,y);}
function footer(t){render.fillRectangle(navy,0,207,200,21);text(t,8,208,'small',paper);}
function header(t,tag=''){render.fillRectangle(navy,0,0,200,23);text(t,8,2,'small',paper);if(tag)text(tag,150,2,'small',paper);}
function speakerName(n){return (n.speaker||n.actor)==='YoungAlden'?'Young Alden':(n.speaker||n.actor||'Alden');}
function portrait(n){
 render.begin();lastImage=null;lastImageName=null;render.fillRectangle(paper,0,0,200,228);render.end();Debug.gc();
 graphics.showPortrait(art[n.actor+'-'+n.emotion+'-full'],n.actor==='Hannah'?1:n.actor==='YoungAlden'?2:0);
}
const previewGroups=[];sceneGroups.forEach(g=>{if(!previewGroups.includes(g))previewGroups.push(g);});
let previewGroup='Episode 11',previewIndex=0,backgroundMotion=localStorage.getItem('backgroundMotion')!=='0';
graphics.setBackgroundMotion(backgroundMotion?1:0);
function groupIds(){const ids=[];sceneGroups.forEach((g,i)=>{if(g===previewGroup)ids.push(i+1);});return ids;}
function menuItems(){return overlay==='animations'?[...previewGroups,'Back']:overlay==='scene-list'?[...groupIds().map(id=>sceneNames[id-1]),'Back']:overlay==='library'?['Read Episode '+pack.number,'Refresh episode','About this story',...(pack.id!==bundled.id?['Read included Ep '+bundled.number]:[]),'Back']:overlay==='restart'?['Keep reading','Restart episode']:['Resume','Refresh episode','Animations','Background motion: '+(backgroundMotion?'On':'Off'),'Restart','Library'];}
function previewReturn(){previewScene=0;overlay='scene-list';menuIndex=previewIndex;}

function stopScene(){if(activeScene){graphics.showScene(0);activeScene=0;}}
function showAnimation(id,recipe){
 graphics.showPortrait(0,0);lastImage=null;lastImageName=null;
 if(activeScene!==id){Debug.gc();if(id===-1){if(!loadRecipe(recipe,1))throw Error("Invalid scene recipe");}else graphics.showScene(id);activeScene=id;}
}
function draw(){
 if(previewScene&&!overlay){showAnimation(previewScene);return;}
 const visible=current(pack,state);if(!overlay&&visible.type==='animation'){showAnimation(visible.recipe?-1:(sceneIds[visible.id]||0),visible.recipe);return;}
 stopScene();
 if(!overlay&&(visible.type==='opening'||visible.type==='end')){graphics.showPortrait(art[pack.cover||(visible.type==='opening'?'opening':'closing')],visible.type==='opening'?3:4);return;}
 if(!overlay&&visible.type==='reaction'){portrait(visible);return;}
 graphics.showPortrait(0,0);
 render.begin();Debug.gc();render.fillRectangle(paper,0,0,200,228);
 const node=current(pack,state);
 if(overlay==='about'){
  header('About this story');
  const body='Super Supportive by Sleyca. A private Mandarin learning adaptation. Original: royalroad.com/fiction/63759. Watch reading progress stays on this watch.';
  const lines=wrap(body,t=>measure(t,'en'));const batch=lines.slice(helpPage*6,helpPage*6+6);batch.forEach((l,i)=>text(l,8,30+i*27));footer((helpPage+1)*6<lines.length?'Select: more   Back: return':'Select: return');
 }else if(overlay){
  header(overlay==='scene-list'?previewGroup:overlay==='animations'?'Animation previews':overlay==='library'?'Episode library':overlay==='restart'?'Start again?':'Chunky Chinese');
  const top=Math.floor(menuIndex/6)*6;menuItems().slice(top,top+6).forEach((item,j)=>{const i=top+j,row=itemsHeight();const y=28+j*row;if(i===menuIndex)render.fillRectangle(teal,5,y,190,row-1);text(item,10,y+3,'small',i===menuIndex?paper:ink);});
  footer(overlay==='library'?status:'Up/Down: browse   Select: open');
 }else{
  const p=phrase(pack,state),all=pages(p,state.e,measure),page=all[Math.min(state.page,all.length-1)];
  const label=node.type==='choice'?'Your choice '+(state.o+1)+'/'+node.options.length:(node.speaker==='YoungAlden'?'Young Alden':node.speaker);
  if(node.type==='choice')header(label,state.c?'Confirm':'');page.py.forEach((l,i)=>text(l,8,31+i*31,'py',teal));
  render.fillRectangle(grey,8,99,184,1);
  page.lower.forEach((l,i)=>text(l,8,109+i*(state.e===0?29:36),state.e===0?'en':'zh'));
  const list=node.type==='choice'?node.options[state.o].phrases:node.phrases;
  text(speakerName(node),8,188,'small',navy);
  const action=state.page+1<all.length?'more':state.p+1<list.length?'next':node.type==='choice'?(state.c?'choose':'confirm'):'next';
  footer('Select: '+action+(node.type==='choice'?' | Up: option':' | Down: '+(state.e?'English':'Chinese')));
 }
 render.end();
}
function itemsHeight(){return 29;}
function closeOverlay(){overlay=null;menuIndex=0;helpPage=0;}
function request(){lastImage=null;lastImageName=null;Debug.gc();status=connected?'Loading from phone...':'Waiting for phone...';send({COMMAND:'LOAD'});}
function input(type){
 if(overlay==='about'){
  if(type==='back'){closeOverlay();}else if(type==='select'){
   const body='Super Supportive by Sleyca. A private Mandarin learning adaptation. Original: royalroad.com/fiction/63759. Watch reading progress stays on this watch.';
   if((helpPage+1)*6<wrap(body,t=>measure(t,'en')).length)helpPage++;else closeOverlay();
  }draw();return;
 }
 if(overlay){
  const items=menuItems();if(type==='up'||type==='down')menuIndex=(menuIndex+(type==='up'?-1:1)+items.length)%items.length;
  else if(type==='back'){if(overlay==='scene-list'){overlay='animations';menuIndex=previewGroups.indexOf(previewGroup);}else if(overlay==='animations'){overlay='menu';menuIndex=2;}else closeOverlay();}else if(type==='select'){
   const chosen=items[menuIndex];
   if(overlay==='animations'&&menuIndex<previewGroups.length){previewGroup=chosen;overlay='scene-list';menuIndex=0;}
   else if(overlay==='scene-list'&&menuIndex<groupIds().length){previewIndex=menuIndex;previewScene=groupIds()[menuIndex];closeOverlay();}
   else if(chosen==='Back'&&overlay==='scene-list'){overlay='animations';menuIndex=previewGroups.indexOf(previewGroup);}
   else if(chosen==='Back'&&overlay==='animations'){overlay='menu';menuIndex=2;}
   else if(chosen.startsWith('Background motion:')){backgroundMotion=!backgroundMotion;localStorage.setItem('backgroundMotion',backgroundMotion?'1':'0');graphics.setBackgroundMotion(backgroundMotion?1:0);}
   else if(chosen==='Animations'){overlay='animations';menuIndex=0;}
   else if(chosen.startsWith('Read included Ep ')){switchEpisode(bundled);activeSlot=null;localStorage.removeItem('activeEpisode');save();closeOverlay();}
   else if(chosen==='Resume'||chosen==='Continue'||chosen.startsWith('Read Episode')||chosen==='Keep reading'||chosen==='Back')closeOverlay();
   else if(chosen==='Restart'){overlay='restart';menuIndex=0;}
   else if(chosen==='Restart episode'){state=initial(pack);save();closeOverlay();}
   else if(chosen==='Library'){overlay='library';menuIndex=0;}
   else if(chosen==='Refresh episode'){overlay='library';menuIndex=1;request();}
   else if(chosen==='About this story'){overlay='about';helpPage=0;}
  }draw();return;
 }
 if(previewScene||current(pack,state).type==='animation'){
  if(type==='select'){
   const result=graphics.sceneSelect();
   if(result){stopScene();if(previewScene){previewReturn();}else{advance(pack,state);save();creditCompletion();}}
  }else if(type==='down'){const id=activeScene;stopScene();showAnimation(id,id===-1?current(pack,state).recipe:undefined);}
  else if(type==='up'&&!previewScene){stopScene();previous(state);save();}
  else if(type==='back'){stopScene();if(previewScene){previewReturn();}else{overlay='menu';menuIndex=0;}}
  draw();return;
 }
 const n=current(pack,state);
 if(type==='back'){overlay='menu';menuIndex=0;}
 else if(n.type==='choice'&&type==='up'){browse(pack,state,1);save();}
 else if(type==='up'){previous(state);save();}
 else if(type==='down'){if(phrase(pack,state)){toggleChinese(state);save();}else{overlay='menu';menuIndex=0;}}
 else if(type==='select'){beginRun(state);const p=phrase(pack,state);advance(pack,state,p?pages(p,state.e,measure).length:1);save();creditCompletion();}
 draw();
}
const buttons=new Button({types:['select','up','down','back'],single:true,onPush(down,type){if(down)try{input(type);}catch(e){console.log('INPUT ERROR',e.stack||e.message);status='Reading error';overlay='library';draw();}}});
// Keep an episode's exact position when selecting a different installed/downloaded story.
function switchEpisode(next){
 if(pack.id!==next.id){
  writeFile('saved-'+pack.id,JSON.stringify(state));
  let resume;try{resume=JSON.parse(readFile('saved-'+next.id));}catch{}
  state=restore(next,resume);
 }else state=migrate(pack,next,state);
 pack=next;
}
let staging=null;
const transfer=new Transfer({
 begin(total){staging=activeSlot==='a'?'b':'a';try{device.files.delete('episode-'+staging);}catch{}const f=device.files.openFile({path:'episode-'+staging,mode:'r+',size:total});f.close();},
 write(data,offset){const f=device.files.openFile({path:'episode-'+staging,mode:'r+'});try{f.write(ArrayBuffer.fromString(data),offset);}finally{f.close();}},
 complete(expected){return openStored('episode-'+staging,expected);},
 activate(next){stopScene();previewScene=0;switchEpisode(next);localStorage.setItem('activeEpisode',staging);activeSlot=staging;save();console.log('Episode activated',pack.id,pack.version);}
},p=>{validate(p,glyphs,hasArt,r=>loadRecipe(r,0));if(p.id===bundled.id&&(p.version===upgrade.version||p.version===legacy.version))throw Error('Older feed; kept animations');});
let channel;
function send(obj){queued.push(obj);flush();}
function flush(){if(channel&&connected&&!sending&&queued.length){const out=queued.shift();try{sending=true;channel.write(new Map(Object.entries(out)));}catch(e){queued.unshift(out);sending=false;console.log('SEND',e.message);}}}
channel=new Message({input:1024,output:256,keys:['COMMAND','DATA','OFFSET','TOTAL','CHECKSUM','VERSION','STATUS'],
 onWritable(){connected=true;sending=false;flush();},
 onSuspend(){connected=false;sending=false;},
 onReadable(){const m=this.read();try{
  const cmd=m.get('COMMAND');
  if(cmd==='BEGIN')console.log('Transfer starting',m.get('TOTAL'),m.get('CHECKSUM'));
  if(cmd==='HELLO'){send({COMMAND:'READY'});syncCredits();}
  else if(cmd==='CREDIT_ACK'){const id=m.get('DATA');if(state.runId===id){state.credited=id;save();}storeCredits(acknowledge(pendingCredits(),id));status='Garden circle synced';syncCredits();}
  else if(cmd==='CREDIT_STATUS'){status=m.get('STATUS')||'Garden sync pending';}
  else if(cmd==='BEGIN'){transfer.begin(m.get('TOTAL'),m.get('CHECKSUM'),m.get('VERSION'));status='Downloading 0%';send({COMMAND:'ACK',OFFSET:0});}
  else if(cmd==='CHUNK'){if(checksum(m.get('DATA'))!==m.get('CHECKSUM'))throw Error('Chunk checksum '+m.get('OFFSET')+' '+checksum(m.get('DATA'))+'/'+m.get('CHECKSUM')+' len '+m.get('DATA').length);const offset=transfer.chunk(m.get('OFFSET'),m.get('DATA'));status='Downloading '+Math.floor(offset/transfer.pending.total*100)+'%';send({COMMAND:'ACK',OFFSET:offset});}
  else if(cmd==='END'){transfer.finish();status='Available offline';send({COMMAND:'DONE',VERSION:pack.version});draw();}
  else if(cmd==='ERROR'){status=m.get('STATUS')||'Phone unavailable';}
 }catch(e){status=e.message==='Older feed; kept animations'?e.message:'Download rejected';console.log('TRANSFER ERROR',e.message);send({COMMAND:'ERROR',STATUS:String(e.message).slice(0,80)});}if(overlay==='library')draw();}
});
console.log('Chunky ready',pack.id,pack.version,'node',state.n);creditCompletion();draw();
