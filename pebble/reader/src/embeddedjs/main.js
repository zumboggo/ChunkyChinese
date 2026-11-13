import Debug from 'debug';
import Poco from 'commodetto/Poco';
import Button from 'pebble/button';
import Message from 'pebble/message';
import bundled from './episode';
import glyphs from './glyphs';
import art from './art';
import {initial,current,phrase,advance,previous,browse,restore} from './reader';
import {pages,wrap} from './layout';
import {Transfer,validate,checksum} from './transfer';
import {openWire} from './wire';
const render=new Poco(screen);
const fonts={py:new render.Font(art['font-latin-24']),en:new render.Font(art['font-latin-20']),zh:new render.Font(art['font-chinese-28']),small:new render.Font('Gothic-Regular',14)};
const ink=render.makeColor(0,0,0),paper=render.makeColor(255,255,255),navy=render.makeColor(0,0,85),teal=render.makeColor(0,85,85),grey=render.makeColor(85,85,85);
function readFile(path){const f=device.files.openFile({path});try{return String.fromArrayBuffer(f.read(f.status().size,0));}finally{f.close();}}
function writeFile(path,text){try{device.files.delete(path);}catch{}const bytes=ArrayBuffer.fromString(text);const f=device.files.openFile({path,mode:'r+',size:bytes.byteLength});try{f.write(bytes,0);}finally{f.close();}}
function openStored(path,expected){
 const f=device.files.openFile({path});try{return openWire(f.status().size,(offset,count)=>String.fromArrayBuffer(f.read(count,offset)),expected,(offset,count)=>{const file=device.files.openFile({path});try{return String.fromArrayBuffer(file.read(count,offset));}finally{file.close();}});}finally{f.close();}
}
const hasArt=name=>!!art[name]||!!art[name+'-64'];
let pack=bundled,activeSlot=localStorage.getItem('activeEpisode');
try{if(activeSlot){pack=openStored('episode-'+activeSlot);validate(pack,glyphs,hasArt);}}catch(e){console.log('Using bundled episode',e.message);pack=bundled;activeSlot=null;}
let state=initial(pack),saveGeneration=0;
// Two generations allow recovery if power is lost while the newest save is written.
for(const slot of [0,1])try{const saved=JSON.parse(readFile('progress-'+slot));if(saved.generation>saveGeneration&&saved.state.id===pack.id&&saved.state.version===pack.version){state=restore(pack,saved.state);saveGeneration=saved.generation;}}catch{}
let overlay=null,menuIndex=0,helpPage=0,status='Available offline',connected=false,sending=false,queued=null,lastImage=null,lastImageName=null;
function save(){try{saveGeneration++;writeFile('progress-'+(saveGeneration%2),JSON.stringify({generation:saveGeneration,state}));}catch(e){status='Save failed - keep app open';console.log('SAVE ERROR',e.message);}}
function measure(text,kind){return render.getTextWidth(text,fonts[kind]);}
function image(name,x=0,y=0){const id=art[name];if(!id)return;if(lastImageName!==name){lastImage=null;Debug.gc();lastImage=new Poco.PebbleBitmap(id);lastImageName=name;}render.drawBitmap(lastImage,x,y);}
function text(t,x,y,kind='en',color=ink){render.drawText(t,fonts[kind],color,x,y);}
function footer(t){render.fillRectangle(navy,0,207,200,21);text(t,8,208,'small',paper);}
function header(t,tag=''){render.fillRectangle(navy,0,0,200,23);text(t,8,2,'small',paper);if(tag)text(tag,150,2,'small',paper);}
function menuItems(){return overlay==='controls'?['Continue','English help','Previous phrase','Portrait: '+(localStorage.getItem('portraitSize')||'64')]:overlay==='library'?['Read Episode '+pack.number,'Load from phone','About this story','Back']:overlay==='restart'?['Keep reading','Restart episode']:['Resume','Restart','Library'];}
function draw(){
 render.begin();render.fillRectangle(paper,0,0,200,228);
 const node=current(pack,state);
 if(overlay==='help'||overlay==='about'){
  header(overlay==='help'?'English help':'About this story');
  const body=overlay==='help'?(phrase(pack,state)?.en||'English appears below pinyin in the first encounter.'):'Super Supportive by Sleyca. A private Mandarin learning adaptation. Original: royalroad.com/fiction/63759. Watch reading progress stays on this watch.';
  const lines=wrap(body,t=>measure(t,'en'));const batch=lines.slice(helpPage*6,helpPage*6+6);batch.forEach((l,i)=>text(l,8,30+i*27));footer((helpPage+1)*6<lines.length?'Select: more   Back: return':'Select: return');
 }else if(overlay){
  header(overlay==='library'?'Episode library':overlay==='controls'?'Reading controls':overlay==='restart'?'Start again?':'Chunky Chinese');
  menuItems().forEach((item,i)=>{const y=31+i*35;if(i===menuIndex)render.fillRectangle(teal,5,y,190,33);text(item,10,y+3,'en',i===menuIndex?paper:ink);});
  footer(overlay==='library'?status:'Up/Down: browse   Select: open');
 }else if(node.type==='opening'||node.type==='end'){
  image(node.type==='opening'?'opening':'closing');render.fillRectangle(navy,0,163,200,65);
  text(node.type==='opening'?'We Could Do':'We Could Do',9,164,'en',paper);text(node.type==='opening'?'Better':'Better',9,187,'en',paper);
  footer(node.type==='opening'?'Episode 11   Select: begin':'Episode complete   Back: menu');
 }else if(node.type==='reaction'){
  header(node.scene==='restaurant'?'The island - years earlier':'On the train');const size=Number(localStorage.getItem('portraitSize')||64);image(node.actor+'-'+node.emotion+'-'+size,(200-size)/2,48);
  text(node.actor==='YoungAlden'?'Alden, age eleven':node.actor,12,130);text(node.emotion==='warm'?'A warm smile':node.emotion.charAt(0).toUpperCase()+node.emotion.slice(1),12,159,'en',grey);footer('Select: continue   Up: previous');
 }else{
  const p=phrase(pack,state),all=pages(p,state.e,measure),page=all[Math.min(state.page,all.length-1)];
  const label=node.type==='choice'?'Your choice '+(state.o+1)+'/'+node.options.length:(node.speaker==='YoungAlden'?'Young Alden':node.speaker);
  header(label,(state.e+1)+'/2');page.py.forEach((l,i)=>text(l,8,31+i*31,'py',teal));
  render.fillRectangle(grey,8,99,184,1);
  page.lower.forEach((l,i)=>text(l,8,109+i*(state.e===0?29:36),state.e===0?'en':'zh'));
  const list=node.type==='choice'?node.options[state.o].phrases:node.phrases;
  let action=state.page+1<all.length?'more':state.e===0?'characters':state.p+1<list.length?'next phrase':node.type==='choice'?'choose':'next phrase';
  footer('Select: '+action+(node.type==='choice'?' | Up/Down':''));
 }
 render.end();
}
function closeOverlay(){overlay=null;menuIndex=0;helpPage=0;}
function request(){status=connected?'Loading from phone...':'Waiting for phone...';send({COMMAND:'LOAD'});}
function input(type){
 if(overlay==='help'||overlay==='about'){
  if(type==='back'){closeOverlay();}else if(type==='select'){
   const body=overlay==='help'?(phrase(pack,state)?.en||'English appears below pinyin in the first encounter.'):'Super Supportive by Sleyca. A private Mandarin learning adaptation. Original: royalroad.com/fiction/63759. Watch reading progress stays on this watch.';
   if((helpPage+1)*6<wrap(body,t=>measure(t,'en')).length)helpPage++;else closeOverlay();
  }draw();return;
 }
 if(overlay){
  const items=menuItems();if(type==='up'||type==='down')menuIndex=(menuIndex+(type==='up'?-1:1)+items.length)%items.length;
  else if(type==='back')closeOverlay();else if(type==='select'){
   const chosen=items[menuIndex];
   if(chosen==='Resume'||chosen==='Continue'||chosen.startsWith('Read Episode')||chosen==='Keep reading'||chosen==='Back')closeOverlay();
   else if(chosen==='Restart'){overlay='restart';menuIndex=0;}
   else if(chosen==='Restart episode'){state=initial(pack);save();closeOverlay();}
   else if(chosen==='Library'){overlay='library';menuIndex=0;}
   else if(chosen==='Load from phone')request();
   else if(chosen==='English help'){overlay='help';helpPage=0;}
   else if(chosen==='About this story'){overlay='about';helpPage=0;}
   else if(chosen==='Previous phrase'){previous(state);save();closeOverlay();}
   else if(chosen.startsWith('Portrait:')){localStorage.setItem('portraitSize',chosen.endsWith('64')?'48':'64');}
  }draw();return;
 }
 const n=current(pack,state);
 if(type==='back'){overlay='menu';menuIndex=0;}
 else if(n.type==='choice'&&(type==='up'||type==='down')){browse(pack,state,type==='up'?-1:1);save();}
 else if(type==='up'){previous(state);save();}
 else if(type==='down'){overlay='controls';menuIndex=0;}
 else if(type==='select'){const p=phrase(pack,state);advance(pack,state,p?pages(p,state.e,measure).length:1);save();}
 draw();
}
const buttons=new Button({types:['select','up','down','back'],single:true,onPush(down,type){if(down)try{input(type);}catch(e){console.log('INPUT ERROR',e.stack||e.message);status='Reading error';overlay='library';draw();}}});
let staging=null;
const transfer=new Transfer({
 begin(total){staging=activeSlot==='a'?'b':'a';try{device.files.delete('episode-'+staging);}catch{}const f=device.files.openFile({path:'episode-'+staging,mode:'r+',size:total});f.close();},
 write(data,offset){const f=device.files.openFile({path:'episode-'+staging,mode:'r+'});try{f.write(ArrayBuffer.fromString(data),offset);}finally{f.close();}},
 complete(expected){return openStored('episode-'+staging,expected);},
 activate(next){localStorage.setItem('activeEpisode',staging);activeSlot=staging;if(next.id!==pack.id||next.version!==pack.version)state=initial(next);pack=next;save();}
},p=>validate(p,glyphs,hasArt));
let channel;
function send(obj){queued=obj;if(channel&&connected&&!sending){try{sending=true;const out=queued;queued=null;channel.write(new Map(Object.entries(out)));}catch(e){queued=obj;sending=false;console.log('SEND',e.message);}}}
channel=new Message({input:1024,output:256,keys:['COMMAND','DATA','OFFSET','TOTAL','CHECKSUM','VERSION','STATUS'],
 onWritable(){connected=true;sending=false;if(queued)send(queued);},
 onSuspend(){connected=false;sending=false;},
 onReadable(){const m=this.read();try{
  const cmd=m.get('COMMAND');
  if(cmd==='BEGIN')console.log('Transfer starting',m.get('TOTAL'),m.get('CHECKSUM'));
  if(cmd==='HELLO'){/* Native handshake. */}
  else if(cmd==='BEGIN'){transfer.begin(m.get('TOTAL'),m.get('CHECKSUM'),m.get('VERSION'));status='Downloading 0%';send({COMMAND:'ACK',OFFSET:0});}
  else if(cmd==='CHUNK'){if(checksum(m.get('DATA'))!==m.get('CHECKSUM'))throw Error('Chunk checksum '+m.get('OFFSET')+' '+checksum(m.get('DATA'))+'/'+m.get('CHECKSUM')+' len '+m.get('DATA').length);const offset=transfer.chunk(m.get('OFFSET'),m.get('DATA'));status='Downloading '+Math.floor(offset/transfer.pending.total*100)+'%';send({COMMAND:'ACK',OFFSET:offset});}
  else if(cmd==='END'){transfer.finish();status='Available offline';send({COMMAND:'DONE',VERSION:pack.version});}
  else if(cmd==='ERROR'){status=m.get('STATUS')||'Phone unavailable';}
 }catch(e){status='Download rejected';console.log('TRANSFER ERROR',e.message);send({COMMAND:'ERROR',STATUS:String(e.message).slice(0,80)});}if(overlay==='library')draw();}
});
console.log('Chunky ready',pack.id,pack.version,'node',state.n);draw();
