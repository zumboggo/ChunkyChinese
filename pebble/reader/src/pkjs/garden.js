/* Durable phone outbox; the watch keeps its copy until the server confirms it. */
module.exports=function(Pebble,storage,Request,schedule){
 var url='https://nvrofeaaewwdeefxtmqu.supabase.co/functions/v1/hearth-garden',busy=false,retry=null;
 function read(){try{return JSON.parse(storage.getItem('garden-outbox')||'[]');}catch(e){return [];}}
 function write(q){storage.setItem('garden-outbox',JSON.stringify(q));}
 function status(s){Pebble.sendAppMessage({COMMAND:'CREDIT_STATUS',STATUS:s});}
 function valid(e){return e&&/^pebble-[a-z0-9]+-[a-z0-9]+$/.test(e.id)&&/^[a-z0-9]+-\d+(?:-v\d+)?$/.test(e.episode)&&Number.isFinite(e.at)&&e.at>0;}
 function flush(){
  if(busy)return;var q=read(),token=storage.getItem('garden-token');if(!q.length)return;
  if(!token){status('Set your Garden connection key');return;}
  busy=true;var event=q[0],x=new Request(),finished=false;
  function finish(ok){if(finished)return;finished=true;busy=false;
   if(ok){write(read().filter(function(e){return e.id!==event.id;}));Pebble.sendAppMessage({COMMAND:'CREDIT_ACK',DATA:event.id});flush();}
   else{status('Garden credit saved; retrying');if(!retry)retry=schedule(function(){retry=null;flush();},30000);}
  }
  x.open('POST',url,true);x.timeout=15000;x.setRequestHeader('Content-Type','application/json');
  x.onload=function(){try{var data=JSON.parse(x.responseText);finish(x.status===200&&data.ack===event.id);}catch(e){finish(false);}};
  x.onerror=x.ontimeout=function(){finish(false);};
  try{x.send(JSON.stringify({token:token,action:'episode-complete',completion:event}));}catch(e){finish(false);}
 }
 return {receive:function(raw){try{var e=JSON.parse(raw);if(!valid(e))throw Error('Invalid completion');var q=read();if(!q.some(function(x){return x.id===e.id;})){q.push(e);write(q);}flush();}catch(e){status('Could not save Garden credit');}},flush:flush,
 configure:function(token){if(token===undefined)return;token=String(token).trim();if(token&&!/^[A-Za-z0-9_-]{43}$/.test(token))throw Error('Invalid Garden connection key');if(token)storage.setItem('garden-token',token);flush();}};
};
