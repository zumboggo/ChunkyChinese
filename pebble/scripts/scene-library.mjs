import fs from 'node:fs';
export const libraryPath=new URL('../scenes/library.json',import.meta.url);
export const shippedIds={"train-phone":1,"restaurant-seat":2,"hannah-fry":3,"alden-listens":4,"train-reflection":5,"gorgon-listen":6,"gorgon-offer":7,"gorgon-think":8,"gorgon-sip":9,"boe-listen":10,"boe-offer":11,"boe-think":12,"boe-sip":13,"jeremy-listen":14,"jeremy-offer":15,"jeremy-think":16,"jeremy-sip":17,"background-train-train":18,"background-cafe-walkers":19,"background-consulate-walkers":20,"background-home-foliage":21,"background-classroom-foliage":22,"background-trading-light":23,"background-home-rain":24,"background-home-cat":25,"jeremy-train-listen":26,"boe-train-think":27,"jeremy-train-think":28,"jeremy-street-listen":29,"boe-street-think":30};
export function validateLibrary(d){
 const fail=s=>{throw Error('Scene library: '+s);};
 if(d.schema!==1||!Number.isInteger(d.fps)||d.fps<1||d.fps>30||!Number.isInteger(d.holdGuard)||d.holdGuard<0)fail('invalid schema/timing');
 if(!Array.isArray(d.scenes)||d.scenes.length<5)fail('missing shipped recipes');
 if(d.ambient?.period!==12000||d.ambient?.fps!==6||d.ambient?.trainTile!==180||d.ambient?.farCycles!==1||d.ambient?.nearCycles!==3)fail('unsupported ambient timing');
 for(const name of ['seated','glance','lean','reach','lift','hold','settle'])if(!d.poses?.[name])fail('missing required pose '+name);
 const fields={head:3,shoulder:2,hip:2,hand:2,gaze:0,brow:0,phone:0};
 for(const [name,p] of Object.entries(d.poses))for(const [k,n] of Object.entries(fields)){
  const values=n?p[k]:[p[k]];
  if(!Array.isArray(values)||values.length!==(n||1)||values.some(v=>!Number.isFinite(v)||Math.abs(v)>1000))fail('invalid pose '+name+'.'+k);
 }
 for(const [name,a] of Object.entries(d.actions)){
  if(!Array.isArray(a.keys)||a.keys.length<2||a.keys[0].t!==0)fail('invalid keys '+name);
  a.keys.forEach((k,i)=>{if(!d.poses[k.pose]||!Number.isInteger(k.t)||k.t<0||k.t>65535||(i&&k.t<=a.keys[i-1].t))fail('invalid key '+name);});
  if(!Number.isInteger(a.contact)||a.contact<0||a.contact>a.keys.at(-1).t)fail('invalid contact '+name);
 }
 const allowed=new Set(['head.x','head.y','shoulder.x','shoulder.y','hip.x','hip.y','hand.x','hand.y','angle','gaze','brow','phone']);
 for(const s of d.scenes)for(const [name,a] of Object.entries(s.actors||{})){
  if(!['child','hannah'].includes(name)||!d.poses[a.pose])fail('invalid actor binding');
  for(const tr of a.tracks){
   if(!allowed.has(tr.field)||tr.keys.length<2||tr.keys[0].t!==0)fail('invalid joint track');
   tr.keys.forEach((k,i)=>{if(!Number.isFinite(k.value)||Math.abs(k.value)>327.67||Math.abs(k.value*100-Math.round(k.value*100))>0.000001||!Number.isInteger(k.t)||k.t<0||k.t>s.duration||(i&&k.t<=tr.keys[i-1].t))fail('invalid joint key');});
  }
  if(a.idle&&(!allowed.has(a.idle.field)||!Number.isFinite(a.idle.rate)||!Number.isFinite(a.idle.amplitude)))fail('invalid idle');
 }
 const ids=new Set();d.scenes.forEach((s,i)=>{
  if(!/^[a-z][a-z0-9-]+$/.test(s.id)||ids.has(s.id)||s.nativeId!==i+1)fail('duplicate/noncontiguous scene ID');ids.add(s.id);
  if(!['train','cafe','consulate','home','classroom','trading','street'].includes(s.setting)||!s.name||!Number.isInteger(s.duration)||s.duration<=0||s.duration>65535)fail('invalid scene '+s.id);
  if(!['train','walkers','foliage','light','rain','cat'].includes(s.ambient)||typeof s.group!=='string')fail('invalid ambient/group');
  if(s.nativeId>5&&!s.ensemble&&!s.sample&&s.visualNovel!==true)fail('new recipes require an explicit native renderer binding');
  if(s.ensemble&&(!['gorgon','boe','jeremy'].includes(s.ensemble.actor)||!['listen','offer','think','sip'].includes(s.ensemble.gesture)||s.duration!==4800))fail('invalid ensemble binding');
  if(s.action&&(!d.actions[s.action]||d.actions[s.action].keys.at(-1).t!==s.duration))fail('action duration mismatch');
 });
 for(const [id,n] of Object.entries(shippedIds))if(d.scenes.find(s=>s.id===id)?.nativeId!==n)fail('shipped ABI changed: '+id);
 const fry=d.scenes[2].prop,cup=d.scenes[3].prop,r=d.scenes[4].reflection;
 for(const [value,max] of [[fry?.contact,d.scenes[2].duration],[fry?.bite,d.scenes[2].duration],[fry?.length,30],[fry?.bittenLength,30],[cup?.release,d.scenes[3].duration],[r?.duration,d.scenes[4].duration],[r?.browDuration,d.scenes[4].duration]])if(!Number.isInteger(value)||value<=0||value>max)fail('invalid prop/reflection timing');
 if(fry.bite<fry.contact||fry.bittenLength>fry.length||!d.poses[r.from]||!d.poses[r.to]||!Number.isFinite(r.brow))fail('invalid prop/reflection recipe');
 const phone=d.scenes[0];if(!Number.isInteger(phone.establish)||phone.glanceStart<0||phone.glanceDuration<=0||phone.glanceStart+phone.glanceDuration!==phone.establish||typeof phone.prompt!=='string'||phone.prompt.length>22||!/^[ -~]+$/.test(phone.prompt))fail('invalid interactive scene');
 return d;
}
export function readLibrary(){return validateLibrary(JSON.parse(fs.readFileSync(libraryPath)));}
