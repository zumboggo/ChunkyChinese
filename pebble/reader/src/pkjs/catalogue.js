/* Paged metadata only; story bytes are fetched separately after a watch selection. */
module.exports=function(storage,Request,base){
 var cached=null,serial=0;
 function validId(id){return typeof id==='string'&&/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*-\d+(?:-v\d+)?$/.test(id)&&id.length<=48;}
 function validate(c){
  if(!c||c.schema!==1||!Array.isArray(c.episodes)||c.episodes.length>2000)throw Error('Invalid catalogue');
  var ids={},numbers={};c.episodes.forEach(function(e){
   if(!validId(e.id)||!Number.isInteger(e.number)||e.number<1||e.number>99999||typeof e.title!=='string'||!e.title.trim()||e.title.length>80||!/^[ -~]+$/.test(e.title)||!/^\w{12}$/.test(e.version)||ids[e.id]||numbers[e.number])throw Error('Invalid catalogue entry');
   ids[e.id]=numbers[e.number]=true;
  });
  c.episodes.sort(function(a,b){return a.number-b.number;});return c;
 }
 function get(url,done,fail){var x=new Request();x.open('GET',url+'?refresh='+Date.now(),true);x.timeout=12000;
  x.onload=function(){try{if(x.status<200||x.status>=300)throw Error();done(JSON.parse(x.responseText));}catch(e){fail('Download unavailable');}};
  x.onerror=x.ontimeout=function(){fail('Connect phone and try again');};try{x.send();}catch(e){fail('Connect phone and try again');}
 }
 function saved(){if(cached)return cached;try{cached=validate(JSON.parse(storage.getItem('episode-catalogue')));}catch(e){}return cached;}
 function catalogue(done,fail){get(base+'catalogue.json',function(c){try{cached=validate(c);storage.setItem('episode-catalogue',JSON.stringify(cached));done(cached,false);}catch(e){fail('Invalid catalogue; kept story');}},function(message){var c=saved();if(c)done(c,true);else fail(message);});}
 function page(c,kind,offset,offline){
  var all;if(kind==='groups'){all=[];c.episodes.forEach(function(e){var first=Math.floor((e.number-1)/10)*10+1;if(!all.length||all[all.length-1][0]!==first)all.push([first,first+9]);});}
  else{var first=Number(kind);if(!Number.isInteger(first)||first<1||(first-1)%10)throw Error('Invalid range');all=c.episodes.filter(function(e){return e.number>=first&&e.number<first+10;}).map(function(e){return [e.id,e.number,e.title,e.version];});}
  offset=Math.max(0,Math.min(Number.isInteger(offset)?offset:0,Math.max(0,all.length-1)));offset=Math.floor(offset/5)*5;
  return {kind:kind,offset:offset,total:all.length,offline:offline,items:all.slice(offset,offset+5)};
 }
 return {
  list:function(kind,offset,done,fail){catalogue(function(c,offline){try{done(page(c,kind,offset,offline));}catch(e){fail('Invalid catalogue range');}},fail);},
  load:function(id,done,fail){var request=++serial;if(!validId(id)){fail('Invalid episode selection');return;}
   function fetch(c){if(request!==serial)return;var e=c.episodes.find(function(e){return e.id===id;});if(!e){fail('Episode not published yet');return;}
    get(base+encodeURIComponent(id)+'.json',function(p){if(request!==serial)return;if(p.id!==id||p.version!==e.version){fail('Episode updating; refresh list');return;}done(p);},function(m){if(request===serial)fail(m);});
   }
   catalogue(fetch,function(m){if(request===serial)fail(m);});
  },
  validate:validate,page:page
 };
};
