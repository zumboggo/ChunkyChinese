import Debug from 'debug';
import {beginRun,completionEvent,enqueue,acknowledge} from './completion';
import graphics from './native';
import Poco from 'commodetto/Poco';
import Button from 'pebble/button';
import Message from 'pebble/message';

import bundled from './bundled';
import legacy from './legacy';
import upgrade from './upgrade';
import {sceneId,sceneName,sceneGroup,sceneCount} from './scenes-native';
import glyphs from './glyphs';
import art from './art-native';
import {initial,current,phrase,advance,choose,previous,restore,toggleChinese,migrate,migrateLegacy} from './reader';
import {pages,wrap} from './layout';
import {Transfer,validate,checksum} from './transfer';
import {openWire} from './wire';
import {validPage,localPage,actions} from './catalogue';
import {Offline,nextPlan} from './offline';

const render=new Poco(screen,{pixels:64,displayListLength:64});
const chineseFont=art('font-chinese-28');
const fonts={py:new render.Font(art('font-latin-24')),en:new render.Font(art('font-latin-20')),zh:chineseFont?new render.Font(chineseFont):null,small:new render.Font('Gothic-Regular',14)};
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
const hasArt=name=>!!art(name)||!!art(name+'-full');
function removeFile(path){try{device.files.delete(path);}catch{}}
const offline=new Offline({get:()=>localStorage.getItem('offline-index'),set:s=>localStorage.setItem('offline-index',s),remove:path=>{if(!activeSlot||path!==slotPath(activeSlot))removeFile(path);},create(path,size){const f=device.files.openFile({path,mode:'r+',size});f.close();}});
Debug.gc();
function slotPath(slot){return slot.startsWith('offline-')?slot:'episode-'+slot;}
let pack=bundled,activeSlot=localStorage.getItem('activeEpisode');

let state=initial(pack),saveGeneration=0,upgraded=false;
// Two generations allow recovery if power is lost while the newest save is written.
function restoreSaved(){
console.log('Reading saves');const saves=[];
for(const slot of [0,1]){try{const raw=readFile('progress-'+slot),match=raw.match(/^\{"generation":(\d+),/);if(match)saves.push({path:'progress-'+slot,generation:Number(match[1])});}catch{}Debug.gc();}
saves.sort((a,b)=>b.generation-a.generation);
let archivedId="";
for(const candidate of saves){try{let raw=readFile(candidate.path);const h=raw.indexOf('"history":['),end=raw.indexOf(']',h);if(h>=0&&end-h>800)raw=raw.slice(0,h)+'"history":[]'+raw.slice(end+1);const saved=JSON.parse(raw);if(saved.state.id!==pack.id&&saved.state.id!==archivedId&&/^[a-z0-9-]+$/.test(saved.state.id)){writeFile('saved-'+saved.state.id,JSON.stringify(saved.state));archivedId=saved.state.id;}if(saved.state.id===pack.id&&(saved.state.version===pack.version||saved.state.version===pack.textVersion)){state=restore(pack,saved.state);saveGeneration=saved.generation;upgraded=saved.state.version!==pack.version;break;}else if(saved.state.id===upgrade.id&&saved.state.version===upgrade.version&&pack.version===upgrade.target){state=migrateLegacy(pack,saved.state,upgrade);saveGeneration=saved.generation;upgraded=true;break;}else if(saved.state.id===legacy.id&&saved.state.version===legacy.version&&pack.version===legacy.target){state=migrateLegacy(pack,saved.state,legacy);saveGeneration=saved.generation;upgraded=true;break;}}catch{}Debug.gc();}
}
let overlay=null,menuIndex=0,helpPage=0,status='Available offline',connected=false,sending=false,queued=[],lastImageName=null,activeScene=0,previewScene=0;
function save(){try{saveGeneration++;writeFile('progress-'+(saveGeneration%2),JSON.stringify({generation:saveGeneration,state:{...state,history:state.history.slice(-24)}}));}catch(e){status='Save failed - keep app open';console.log('SAVE ERROR',e.message);}}

function pendingCredits(){try{return JSON.parse(localStorage.getItem('episodeCredits')||'[]');}catch{return [];}}
function storeCredits(events){localStorage.setItem('episodeCredits',JSON.stringify(events));}
function creditCompletion(){const event=completionEvent(pack,state);if(event)localStorage.setItem('done-'+pack.id,'1');if(event&&state.credited!==event.id){storeCredits(enqueue(pendingCredits(),event));save();syncCredits();}}
function syncCredits(){const first=pendingCredits()[0];if(first&&connected)send({COMMAND:'CREDIT',DATA:JSON.stringify(first)});}

function measure(text,kind){return render.getTextWidth(text,fonts[kind]);}
function text(t,x,y,kind='en',color=ink){render.drawText(t,fonts[kind],color,x,y);}
function footer(t){render.fillRectangle(navy,0,207,200,21);while(measure(t,'small')>114)t=t.slice(0,-1);text(t,8,208,'small',paper);}
function header(t,tag=''){render.fillRectangle(navy,0,0,200,23);text(t,8,2,'small',paper);if(tag)text(tag,150,2,'small',paper);}
function speakerName(n){return (n.speaker||n.actor)==='YoungAlden'?'Young Alden':(n.speaker||n.actor||'Alden');}
function portrait(n){
 const key=pack.id+':'+pack.version+':'+state.n;
 if(lastImageName!==key){graphics.showPortrait(0,0);lastImageName=key;}
 render.begin();render.fillRectangle(paper,0,0,200,228);render.end();Debug.gc();
 graphics.showPortrait(art(n.actor+'-'+n.emotion+'-full'),n.actor==='Hannah'?1:n.actor==='YoungAlden'?2:n.actor==='Boe'?5:n.actor==='Jeremy'?6:n.actor==='Gorgon'?7:0);
}
const previewGroups=[];for(let i=1;i<=sceneCount;i++){const g=sceneGroup(i);if(!previewGroups.includes(g))previewGroups.push(g);}
let previewGroup='Episode 11',previewIndex=0,backgroundMotion=localStorage.getItem('backgroundMotion')!=='0';
graphics.setBackgroundMotion(backgroundMotion?1:0);
function groupIds(){const ids=[];for(let i=1;i<=sceneCount;i++)if(sceneGroup(i)===previewGroup)ids.push(i);return ids;}
let cataloguePage=null,selectedEpisode=null,catalogueRequest=0,requestedEpisode=null;
let queuePlan=[],queueSerial=0,queueLoading=null,downloadSerial=0,downloadToken='',queueStatus='Connect phone to fill queue';
function offlineEntry(id){const e=offline.find(id);if(!e)return null;try{const f=device.files.openFile({path:offline.path(e)});const size=f.status().size;f.close();return size===e[5]?e:null;}catch{return null;}}
function available(id){return id===pack.id||id===bundled.id||!!offlineEntry(id);}
function useOffline(id){if(id===pack.id){closeOverlay();return;}const e=offlineEntry(id);const next=id===bundled.id?bundled:e?openStored(offline.path(e)):null;if(!next)throw Error('Episode not downloaded');validate(next,glyphs,hasArt,r=>loadRecipe(r,0),Debug.gc);queueLoading=null;downloadToken=String(++downloadSerial);switchEpisode(next);activeSlot=id===bundled.id?null:offline.path(e);if(activeSlot)localStorage.setItem('activeEpisode',activeSlot);else localStorage.removeItem('activeEpisode');save();offline.prune(pack);closeOverlay();refreshQueue();}
function refreshQueue(){if(requestedEpisode||queueLoading)return;queueSerial++;if(connected){queueStatus='Checking next 5...';send({COMMAND:'QUEUE',DATA:pack.id,VERSION:String(queueSerial)});}else queueStatus='Connect phone to fill queue';}
function fillQueue(){
 if(requestedEpisode||queueLoading||!connected)return;
 const next=queuePlan.find(e=>e[0]!==bundled.id&&(!offlineEntry(e[0])||offlineEntry(e[0])[3]!==e[3]));
 if(!next){queueStatus=queuePlan.length?queuePlan.length+' / 5 ready offline':'No later episodes published';queuePlan=[];return;}
 queueLoading=next;downloadToken=String(++downloadSerial);queueStatus='Saving episode '+next[1]+'...';send({COMMAND:'PREFETCH',DATA:next[0],STATUS:downloadToken});
}
function offlineItems(){return offline.items.filter(e=>e[0]!==pack.id&&e[1]>pack.number).sort((a,b)=>a[1]-b[1]);}
function nextOffline(){if(bundled.number===pack.number+1)return [bundled.id,bundled.number];return offlineItems().find(e=>e[1]===pack.number+1);}

function completed(id){
 if(localStorage.getItem('done-'+id)==='1')return true;
 let old;try{old=id===pack.id?state:JSON.parse(readFile('saved-'+id));}catch{}
 if(old&&old.completedAt){localStorage.setItem('done-'+id,'1');return true;}
 return false;
}
function openCatalogue(kind,offset=0){
 if(!cataloguePage){try{cataloguePage=validPage(JSON.parse(localStorage.getItem('catalogue-page')));}catch{cataloguePage=localPage(pack);}}
 overlay='catalogue';menuIndex=0;status='Updating list...';
 send({COMMAND:'CATALOG',DATA:kind,OFFSET:offset,VERSION:String(++catalogueRequest)});
}
function episodeAction(){return selectedEpisode[0]===pack.id?'Resume offline':available(selectedEpisode[0])?'Read offline':'Download / resume';}
function catalogueItems(){return [...cataloguePage.items.map(e=>cataloguePage.kind==='groups'?'Episodes '+e[0]+' - '+e[1]:(completed(e[0])?'[x] ':'[ ] ')+e[1]+'. '+e[2]),...actions(cataloguePage)];}
function menuItems(){return overlay==='offline'?[...offlineItems().map(e=>'Read Ep '+e[1]+': '+e[2]),'Update downloads','Check storage','Back']:overlay==='finished'?[nextOffline()?'Continue to Ep '+nextOffline()[1]:'Next episode not saved','Offline queue','Back']:overlay==='catalogue'?catalogueItems():overlay==='episode'?[episodeAction(),'Choose another','Back']:overlay==='animations'?[...previewGroups,'Back']:overlay==='scene-list'?[...groupIds().map(id=>sceneName(id)),'Back']:overlay==='library'?['Browse episodes','Offline queue','Read Episode '+pack.number,'Refresh episode','About this story',...(pack.id!==bundled.id?['Read included Ep '+bundled.number]:[]),'Back']:overlay==='restart'?['Keep reading','Restart episode']:['Resume','Refresh episode','Animations','Background motion: '+(backgroundMotion?'On':'Off'),'Restart','Library','Offline queue'];}
function previewReturn(){previewScene=0;overlay='scene-list';menuIndex=previewIndex;}

function stopScene(){if(activeScene){graphics.showScene(0);activeScene=0;}}
function showAnimation(id,recipe){
 graphics.showPortrait(0,0);lastImageName=null;
 if(activeScene!==id){Debug.gc();if(id===-1){if(!loadRecipe(recipe,1))throw Error("Invalid scene recipe");}else graphics.showScene(id);activeScene=id;}
}
function draw(){
 if(!chineseFont||pack.chinese===false)state.e=0;
 if(previewScene&&!overlay){showAnimation(previewScene);return;}
 const visible=current(pack,state);if(!overlay&&visible.type==='animation'){showAnimation(visible.recipe?-1:sceneId(visible.id),visible.recipe);return;}
 stopScene();
 if(!overlay&&(visible.type==='opening'||visible.type==='end')){const title=String(pack.shortTitle||pack.title).slice(0,80);for(let i=0;i<title.length;i++)graphics.cardData(i,title.charCodeAt(i));graphics.cardData(80,pack.number);graphics.showPortrait(art(pack.cover||(visible.type==='opening'?'opening':'closing')),visible.type==='opening'?3:4);return;}
 if(!overlay&&visible.type==='reaction'){portrait(visible);return;}
 graphics.showPortrait(0,0);lastImageName=null;
 render.begin();Debug.gc();render.fillRectangle(paper,0,0,200,228);
 const node=current(pack,state);
 if(overlay==='about'){
  header('About this story');
  const body='Super Supportive by Sleyca. A private Mandarin learning adaptation. Original: royalroad.com/fiction/63759. Watch reading progress stays on this watch.';
  const lines=wrap(body,t=>measure(t,'en'));const batch=lines.slice(helpPage*6,helpPage*6+6);batch.forEach((l,i)=>text(l,8,30+i*27));footer((helpPage+1)*6<lines.length?'Select: more | Back':'Select: return');
 }else if(overlay==='episode'){
  header('Episode '+selectedEpisode[1]);
  wrap(selectedEpisode[2],t=>measure(t,'en')).slice(0,3).forEach((l,i)=>text(l,8,29+i*25));
  text(completed(selectedEpisode[0])?'Completed':'Not completed',8,107,'small',teal);
  menuItems().forEach((item,i)=>{const y=130+i*24;if(i===menuIndex)render.fillRectangle(teal,5,y,190,23);text(item,10,y+2,'small',i===menuIndex?paper:ink);});
  footer(status);
 }else if(overlay){
  header(overlay==='offline'?'Next 5 offline':overlay==='finished'?'Episode complete':overlay==='scene-list'?previewGroup:overlay==='animations'?'Animation previews':overlay==='catalogue'?(cataloguePage.kind==='groups'?'Choose episode range':'Episodes '+cataloguePage.kind+' - '+(Number(cataloguePage.kind)+9)):overlay==='library'?'Episode library':overlay==='restart'?'Start again?':'Chunky Chinese');
  const top=Math.floor(menuIndex/6)*6;menuItems().slice(top,top+6).forEach((item,j)=>{const i=top+j,row=itemsHeight();const y=28+j*row;if(i===menuIndex)render.fillRectangle(teal,5,y,190,row-1);let label=item;while(label.length&&measure(label,'small')>178)label=label.slice(0,-1);if(label!==item)label=label.slice(0,-2)+'..';text(label,10,y+3,'small',i===menuIndex?paper:ink);});
  footer(overlay==='offline'?queueStatus:overlay==='finished'?'Select: open':overlay==='library'||overlay==='catalogue'?status:'Up/Down | Select');
 }else if(node.type==='choice'){
  header('Choose in English');let count=choicePageCount(node);state.page%=count;
  for(let i=state.o&2;i<Math.min((state.o&2)+2,node.options.length);i++){
   const y=27+(i%2)*89,lines=choiceLines(node.options[i]);
   text('ABCD'[i]+(i%2?' - press Down':' - press Up'),8,y,'small',teal);
   for(let j=0;j<3;j++){const line=lines[Math.min(state.page,Math.ceil(lines.length/3)-1)*3+j];if(line)text(line,8,y+18+j*22);}
  }
  footer(count>1||node.options.length>2?'Select: more':'Hold Select: light');
 }else{
  header('Hold Select: light');
  const p=phrase(pack,state),all=pages(p,state.e,measure),page=all[Math.min(state.page,all.length-1)];
  page.py.forEach((l,i)=>text(l,8,31+i*31,'py',teal));
  render.fillRectangle(grey,8,99,184,1);
  page.lower.forEach((l,i)=>text(l,8,109+i*(state.e===0?29:36),state.e===0?'en':'zh'));
  text(speakerName(node),8,188,'small',navy);
  footer('Select: '+(state.page+1<all.length?'more':'next'));
 }
 render.end();
}
function choicePageCount(node){let count=1;for(let i=state.o&2;i<Math.min((state.o&2)+2,node.options.length);i++)count=Math.max(count,Math.ceil(choiceLines(node.options[i]).length/3));return count;}
function choiceLines(option){return wrap(option.phrases.map(p=>p.en).join(' '),t=>measure(t,'en'));}
function itemsHeight(){return 29;}
function closeOverlay(){overlay=null;menuIndex=0;helpPage=0;cataloguePage=null;selectedEpisode=null;catalogueRequest++;}
function request(id=pack.id){queueLoading=null;queueSerial++;downloadToken=String(++downloadSerial);requestedEpisode=id;lastImageName=null;Debug.gc();status=connected?'Loading from phone...':'Waiting for phone...';send({COMMAND:'LOAD',DATA:id,STATUS:downloadToken});}
function input(type){
 if(!overlay&&current(pack,state).type==='reaction'){
  if(type==='select'&&!graphics.portraitReady())return;
  if(type==='down'){graphics.showPortrait(0,0);draw();return;}
 }

 if(overlay==='about'){
  if(type==='back'){closeOverlay();}else if(type==='select'){
   const body='Super Supportive by Sleyca. A private Mandarin learning adaptation. Original: royalroad.com/fiction/63759. Watch reading progress stays on this watch.';
   if((helpPage+1)*6<wrap(body,t=>measure(t,'en')).length)helpPage++;else closeOverlay();
  }draw();return;
 }
 if(overlay){
  const items=menuItems();if(type==='up'||type==='down')menuIndex=(menuIndex+(type==='up'?-1:1)+items.length)%items.length;
  else if(type==='back'){if(overlay==='episode'){overlay='catalogue';menuIndex=0;}else if(overlay==='catalogue'){overlay='menu';menuIndex=5;catalogueRequest++;}else if(overlay==='scene-list'){overlay='animations';menuIndex=previewGroups.indexOf(previewGroup);}else if(overlay==='animations'){overlay='menu';menuIndex=2;}else closeOverlay();}else if(type==='select'){
   const chosen=items[menuIndex];
   if(overlay==='offline'){const e=offlineItems()[menuIndex];if(e)useOffline(e[0]);else if(chosen==='Update downloads'){queueLoading=null;requestedEpisode=null;downloadToken=String(++downloadSerial);refreshQueue();}else if(chosen==='Check storage'){const free=offline.probe();queueStatus=(free>=458752?'>= ':'')+Math.floor(free/1024)+' KiB allocatable';console.log('Offline storage',free,'cached',offline.bytes());}else closeOverlay();}
   else if(overlay==='finished'){if(menuIndex===0&&nextOffline())useOffline(nextOffline()[0]);else if(menuIndex===1){overlay='offline';menuIndex=0;refreshQueue();}else if(menuIndex===2)closeOverlay();}
   else if(overlay==='catalogue'){
    if(menuIndex<cataloguePage.items.length){const e=cataloguePage.items[menuIndex];if(cataloguePage.kind==='groups')openCatalogue(String(e[0]));else{selectedEpisode=e;overlay='episode';menuIndex=0;status=available(e[0])?'Available offline':'Select to download';}}
    else if(chosen==='Choose range')openCatalogue('groups');
    else if(chosen==='Next page')openCatalogue(cataloguePage.kind,cataloguePage.offset+5);
    else if(chosen==='Previous page')openCatalogue(cataloguePage.kind,cataloguePage.offset-5);
    else if(chosen==='Update list')openCatalogue(cataloguePage.kind,cataloguePage.offset);
    else{closeOverlay();catalogueRequest++;}
   }
   else if(overlay==='episode'){
    if(menuIndex===0){if(available(selectedEpisode[0]))useOffline(selectedEpisode[0]);else request(selectedEpisode[0]);}
    else{overlay='catalogue';menuIndex=0;}
   }
   else if(overlay==='animations'&&menuIndex<previewGroups.length){previewGroup=chosen;overlay='scene-list';menuIndex=0;}
   else if(overlay==='scene-list'&&menuIndex<groupIds().length){previewIndex=menuIndex;previewScene=groupIds()[menuIndex];closeOverlay();}
   else if(chosen==='Back'&&overlay==='scene-list'){overlay='animations';menuIndex=previewGroups.indexOf(previewGroup);}
   else if(chosen==='Back'&&overlay==='animations'){overlay='menu';menuIndex=2;}
   else if(chosen.startsWith('Background motion:')){backgroundMotion=!backgroundMotion;localStorage.setItem('backgroundMotion',backgroundMotion?'1':'0');graphics.setBackgroundMotion(backgroundMotion?1:0);}
   else if(chosen==='Offline queue'){overlay='offline';menuIndex=0;refreshQueue();}
   else if(chosen==='Animations'){overlay='animations';menuIndex=0;}
   else if(chosen.startsWith('Read included Ep ')){useOffline(bundled.id);}
   else if(chosen==='Resume'||chosen==='Continue'||chosen.startsWith('Read Episode')||chosen==='Keep reading'||chosen==='Back')closeOverlay();
   else if(chosen==='Restart'){overlay='restart';menuIndex=0;}
   else if(chosen==='Restart episode'){state=initial(pack);save();closeOverlay();}
   else if(chosen==='Library'){overlay='library';menuIndex=0;}
   else if(chosen==='Browse episodes'){openCatalogue(String(Math.floor((pack.number-1)/10)*10+1));}
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
 else if(n.type==='choice'){
  if(type==='up'||type==='down'){beginRun(state);choose(pack,state,(state.o&2)+(type==='up'?0:1));save();creditCompletion();}
  else if(type==='select'){state.page++;if(state.page>=choicePageCount(n)){state.page=0;state.o=state.o<2&&n.options.length>2?2:0;}save();}
 }
 else if(type==='up'){previous(state);save();}
 else if(type==='down'){if(phrase(pack,state)&&chineseFont&&pack.chinese!==false){toggleChinese(state);save();}else{overlay='menu';menuIndex=0;}}
 else if(type==='select'&&n.type==='end'){overlay='finished';menuIndex=0;refreshQueue();}
 else if(type==='select'){beginRun(state);const p=phrase(pack,state);advance(pack,state,p?pages(p,state.e,measure).length:1);save();creditCompletion();}
 draw();
}

// Keep an episode's exact position when selecting a different installed/downloaded story.
function switchEpisode(next){
 if(pack.id!==next.id){
  if(state.completedAt)localStorage.setItem('done-'+pack.id,'1');
  writeFile('saved-'+pack.id,JSON.stringify({...state,history:state.history.slice(-24)}));
  let resume;try{resume=JSON.parse(readFile('saved-'+next.id));}catch{}
  state=restore(next,resume);
 }else state=migrate(pack,next,state);
 pack=next;
}
let staging=null;
let transfer;

let channel;
function send(obj){queued.push(obj);flush();}
function flush(){if(channel&&connected&&!sending&&queued.length){const out=queued.shift();try{sending=true;channel.write(new Map(Object.entries(out)));}catch(e){queued.unshift(out);sending=false;console.log('SEND',e.message);}}}

function startReader(){Debug.gc();try{if(activeSlot){pack=openStored(slotPath(activeSlot));Debug.gc();}}catch(e){console.log('Using bundled episode',e.message);pack=bundled;activeSlot=null;}
console.log('Episode opened');Debug.gc();state=initial(pack);if(activeSlot){try{validate(pack,glyphs,hasArt,r=>loadRecipe(r,0),Debug.gc);}catch(e){pack=bundled;activeSlot=null;state=initial(pack);console.log('Using bundled episode',e.message);}}restoreSaved();Debug.gc();
if(localStorage.getItem('readerRevision')!=='3'&&pack.id===bundled.id&&pack.version!==bundled.version){state=pack.version===legacy.version?migrateLegacy(bundled,state,legacy):migrate(pack,bundled,state);upgraded=true;pack=bundled;activeSlot=null;localStorage.removeItem('activeEpisode');}
localStorage.setItem('readerRevision','3');
Debug.gc();
console.log('Save restored',state.n);if(upgraded)save();Debug.gc();new Button({types:['select','up','down','back'],single:true,onPush(down,type){if(down)try{input(type);}catch(e){console.log('INPUT ERROR',e.stack||e.message);status='Reading error';overlay='library';draw();}}});graphics.readerControls();Debug.gc();transfer=new Transfer({
 begin(total){Debug.gc();staging=offline.begin(total,activeSlot);},
 write(data,offset){const f=device.files.openFile({path:staging,mode:'r+'});try{f.write(ArrayBuffer.fromString(data),offset);}finally{f.close();}},
 complete(expected){return openStored(staging,expected);},
 activate(next){offline.commit(next,pack);if(!queueLoading){stopScene();previewScene=0;switchEpisode(next);localStorage.setItem('activeEpisode',staging);activeSlot=staging;save();offline.prune(pack);console.log('Episode activated',pack.id,pack.version);}else console.log('Episode cached',next.id,next.version);}
},p=>{if(!Number.isInteger(p.number)||p.number<1||typeof p.title!=='string')throw Error('Invalid episode metadata');if(queueLoading&&(p.id!==queueLoading[0]||p.number!==queueLoading[1]||p.version!==queueLoading[3]))throw Error('Different queued episode');if(requestedEpisode&&p.id!==requestedEpisode)throw Error('Different episode received');validate(p,glyphs,hasArt,r=>loadRecipe(r,0),Debug.gc);if(p.id===bundled.id&&(p.version===upgrade.version||p.version===legacy.version))throw Error('Older feed; kept animations');});
Debug.gc();channel=new Message({input:768,output:192,keys:['COMMAND','DATA','OFFSET','TOTAL','CHECKSUM','VERSION','STATUS'],
 onWritable(){connected=true;sending=false;flush();},
 onSuspend(){connected=false;sending=false;queueLoading=null;downloadToken=String(++downloadSerial);queueStatus='Reconnect to finish queue';},
 onReadable(){const m=this.read();connected=true;try{
  const cmd=m.get('COMMAND');
  if(['BEGIN','CHUNK','END'].includes(cmd)&&m.get('STATUS')&&m.get('STATUS')!==downloadToken)return;
  if(cmd==='BEGIN')console.log('Transfer starting',m.get('TOTAL'),m.get('CHECKSUM'));
  if(cmd==='HELLO'){send({COMMAND:'READY'});syncCredits();if(requestedEpisode)request(requestedEpisode);else if(!queueLoading)refreshQueue();}
  else if(cmd==='PLAN'&&m.get('VERSION')===String(queueSerial)){queuePlan=nextPlan(JSON.parse(m.get('DATA')),pack);fillQueue();}
  else if(cmd==='QUEUE_ERROR'&&m.get('VERSION')===String(queueSerial)){queueStatus=m.get('STATUS')||'Queue unavailable';}
  else if(cmd==='CATALOG'&&m.get('VERSION')===String(catalogueRequest)&&overlay==='catalogue'){const page=validPage(JSON.parse(m.get('DATA')));cataloguePage=page;localStorage.setItem('catalogue-page',JSON.stringify(page));menuIndex=0;status=page.offline?'Saved list; phone offline':'[x] Completed | Select: open';}
  else if(cmd==='CATALOG_ERROR'&&m.get('VERSION')===String(catalogueRequest)){status=m.get('STATUS')||'List unavailable; kept story';}
  else if(cmd==='CREDIT_ACK'){const id=m.get('DATA');if(state.runId===id){state.credited=id;save();}storeCredits(acknowledge(pendingCredits(),id));status='Garden circle synced';syncCredits();}
  else if(cmd==='CREDIT_STATUS'){status=m.get('STATUS')||'Garden sync pending';}
  else if(cmd==='BEGIN'){if(m.get('DATA')&&!m.get('STATUS')){queueLoading=null;queueSerial++;downloadToken='';}transfer.begin(m.get('TOTAL'),m.get('CHECKSUM'),m.get('VERSION'));status='Downloading 0%';send({COMMAND:'ACK',OFFSET:0,STATUS:downloadToken});}
  else if(cmd==='CHUNK'){console.log('Transfer heap',graphics.memoryFree());if(checksum(m.get('DATA'))!==m.get('CHECKSUM'))throw Error('Chunk checksum '+m.get('OFFSET')+' '+checksum(m.get('DATA'))+'/'+m.get('CHECKSUM')+' len '+m.get('DATA').length);const offset=transfer.chunk(m.get('OFFSET'),m.get('DATA'));status='Downloading '+Math.floor(offset/transfer.pending.total*100)+'%';send({COMMAND:'ACK',OFFSET:offset,STATUS:downloadToken});}
  else if(cmd==='END'){const result=transfer.finish();status='Available offline';send({COMMAND:'DONE',VERSION:result.version,DATA:downloadToken});transfer.completed={version:result.version};if(queueLoading){queueLoading=null;fillQueue();}else if(requestedEpisode){requestedEpisode=null;closeOverlay();refreshQueue();}draw();}
  else if(cmd==='ERROR'&&(!m.get('DATA')||m.get('DATA')===downloadToken)){status=m.get('STATUS')||'Phone unavailable';queueStatus=status;queueLoading=null;requestedEpisode=null;}
 }catch(e){status=e.message==='Older feed; kept animations'?e.message:'Download rejected';console.log('TRANSFER ERROR',e.message);queueStatus='Download stopped; saved episodes kept';const failedToken=downloadToken;if(queueLoading)downloadToken=String(++downloadSerial);queueLoading=null;send({COMMAND:'ERROR',STATUS:String(e.message).slice(0,80),DATA:failedToken});}if(overlay==='library'||overlay==='catalogue'||overlay==='episode'||overlay==='offline'||overlay==='finished')draw();}
});
Debug.gc();console.log('Runtime heap',graphics.memoryFree());console.log('Chunky ready',pack.id,pack.version,'node',state.n);creditCompletion();draw();}
startReader();
