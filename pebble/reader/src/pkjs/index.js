/* Runs inside the Android Pebble app; no separate Android APK is required. */
var bundled=require('./bundled.json');
var garden=require('./garden')(Pebble,localStorage,XMLHttpRequest,setTimeout);
var DEFAULT_URL='https://raw.githubusercontent.com/zumboggo/ChunkyChinese/codex/chengdu-game/pebble/content/'+encodeURIComponent(bundled.id)+'.json';
var catalogue=require('./catalogue')(localStorage,XMLHttpRequest,'https://raw.githubusercontent.com/zumboggo/ChunkyChinese/codex/chengdu-game/pebble/content/');
var transfer=null,timer=null,lastMessage=null,retries=0;
function hash(s){var a=1,b=0;for(var i=0;i<s.length;i++){a=(a+s.charCodeAt(i))%65521;b=(b+a)%65521;}return (b*65536+a).toString(16);}
function wire(pack){var meta={};Object.keys(pack).forEach(function(k){if(k!=='nodes')meta[k]=pack[k];});meta.nodeCount=pack.nodes.length;return [JSON.stringify(meta)].concat(pack.nodes.map(function(n){return JSON.stringify(n);})).join('\n').replace(/[^\x20-\x7e\n]/g,function(c){return '\\u'+('0000'+c.charCodeAt(0).toString(16)).slice(-4);})+'\n';}
function stop(){if(timer)clearTimeout(timer);timer=null;transfer=null;lastMessage=null;}
function send(message,wait){lastMessage=message;if(timer)clearTimeout(timer);Pebble.sendAppMessage(message,function(){if(wait)timer=setTimeout(retry,6000);},function(){timer=setTimeout(retry,2000);});}
function retry(){if(!lastMessage)return;if(++retries>4){stop();Pebble.sendAppMessage({COMMAND:'ERROR',STATUS:'Reconnect, then load again'});return;}send(lastMessage,true);}
function begin(pack){stop();var data=wire(pack);if(data.length>65536)throw Error('Episode too large');transfer={data:data,offset:0,version:pack.version};retries=0;send({COMMAND:'BEGIN',TOTAL:data.length,CHECKSUM:hash(data),VERSION:pack.version},true);}
function cached(){try{return JSON.parse(localStorage.getItem('episode-cache'))||bundled;}catch(e){return bundled;}}
function load(id){
 if(id){stop();catalogue.load(id,function(p){try{begin(p);}catch(e){Pebble.sendAppMessage({COMMAND:'ERROR',STATUS:e.message});}},function(message){Pebble.sendAppMessage({COMMAND:'ERROR',STATUS:message});});return;}
 var url=localStorage.getItem('episode-url')||DEFAULT_URL;
 var req=new XMLHttpRequest();req.open('GET',url+(url.indexOf('?')<0?'?':'&')+'refresh='+Date.now(),true);req.timeout=12000;
 function fallback(){Pebble.sendAppMessage({COMMAND:'ERROR',STATUS:'No update; kept offline story'});}
 req.onload=function(){if(req.status<200||req.status>=300){fallback();return;}try{var p=JSON.parse(req.responseText);if(p.format!==1||!p.nodes||!p.version)throw Error('Bad episode');localStorage.setItem('episode-cache',JSON.stringify(p));begin(p);}catch(e){Pebble.sendAppMessage({COMMAND:'ERROR',STATUS:'Invalid episode download'});}};
 req.onerror=fallback;req.ontimeout=fallback;try{req.send();}catch(e){fallback();}
}
var helloTimer=null,helloAttempts=0;
function hello(){
 if(helloTimer)clearTimeout(helloTimer);
 if(++helloAttempts>20)return;
 Pebble.sendAppMessage({COMMAND:'HELLO'},function(){},function(){});
 helloTimer=setTimeout(hello,1500);
}
Pebble.addEventListener('ready',function(){helloAttempts=0;hello();garden.flush();});
Pebble.addEventListener('appmessage',function(event){
 var m=event.payload;
 if(m.COMMAND==='READY'){if(helloTimer)clearTimeout(helloTimer);helloTimer=null;}
 else if(m.COMMAND==='CREDIT')garden.receive(m.DATA);
 else if(m.COMMAND==='LOAD')load(m.DATA);
 else if(m.COMMAND==='CATALOG')catalogue.list(m.DATA||'groups',m.OFFSET||0,function(p){Pebble.sendAppMessage({COMMAND:'CATALOG',DATA:JSON.stringify(p),VERSION:m.VERSION});},function(message){Pebble.sendAppMessage({COMMAND:'CATALOG_ERROR',STATUS:message,VERSION:m.VERSION});});
 else if(m.COMMAND==='ACK'&&transfer){
  clearTimeout(timer);retries=0;var offset=Number(m.OFFSET);
  if(!Number.isInteger(offset)||offset<0||offset>transfer.data.length){stop();return;}
  transfer.offset=offset;
  if(offset===transfer.data.length)send({COMMAND:'END'},true);
  else send({COMMAND:'CHUNK',OFFSET:offset,DATA:transfer.data.slice(offset,offset+600),CHECKSUM:hash(transfer.data.slice(offset,offset+600))},true);
 }else if(m.COMMAND==='DONE'||m.COMMAND==='ERROR')stop();
});
Pebble.addEventListener('webviewclosed',function(event){
 if(!event.response||event.response==='CANCELLED')return;
 try{var config=JSON.parse(decodeURIComponent(event.response));var url=String(config.url||'').trim();
  if(url&&!/^https:\/\/raw\.githubusercontent\.com\//.test(url))throw Error('Use a raw.githubusercontent.com HTTPS package URL');
  if(url)localStorage.setItem('episode-url',url);else localStorage.removeItem('episode-url');
  garden.configure(config.gardenToken);
  if(config.refresh)load();
 }catch(e){console.log('Settings not changed: '+e.message);}
});
