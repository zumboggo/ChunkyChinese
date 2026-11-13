import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {analyse,summary} from './episode-analysis.mjs';
import {readLibrary} from './scene-library.mjs';
import {episodeId} from './episode-target.mjs';
import {validateDirection} from './story-direction.mjs';
import {root,loadProfile} from './runtime-profile.mjs';
import {reviewPage} from './review-page.mjs';
const [command,...args]=process.argv.slice(2);
const read=p=>fs.readFileSync(new URL(p,root),'utf8');
function write(relative,data){const file=new URL(relative,root);fs.mkdirSync(new URL('./',file),{recursive:true});fs.writeFileSync(file,data);return fileURLToPath(file);}
function review(result){
 const library=readLibrary(),ensemble=JSON.parse(read('scenes/ensemble/characters.json'));ensemble.ambient=library.ambient;
 const data={id:result?.id,title:result?.pack?.title||'Pebble recipe catalogue',shots:result?.shots||[],library,ensemble,supported:loadProfile()?.sceneIds||[],messages:result?[...result.errors,...(result.warnings||[]),...(!result.runtime.compatible?['Runtime changes need native verification before content-only export.']:[])]:[]};
 const dir='.local/authoring/'+(result?.id||'catalogue')+'/';
 if(result)write(dir+'review.json',JSON.stringify(summary(result),null,2)+'\n');
 return write(dir+'review.html',reviewPage(data));
}
if(command==='catalogue'){
 if(args.length)throw Error('Usage: catalogue (no episode argument)');console.log(review());
}else if(command==='preflight'){
 if(!args.length)throw Error('Provide one or more episode IDs');
 const reports=args.map(id=>summary(analyse(id))),missing={};for(const r of reports)for(const name of r.missingArt)(missing[name]??=[]).push(r.id);
 console.log(JSON.stringify({episodes:reports,sharedAssetNeeds:missing},null,2));console.log(write('.local/authoring/preflight.json',JSON.stringify({episodes:reports,sharedAssetNeeds:missing},null,2)+'\n'));
 if(reports.some(r=>r.errors.length))process.exitCode=1;
}else if(command==='review'||command==='content'){
 if(args.length!==1)throw Error('Usage: '+command+' <episode-id>');const start=performance.now(),result=analyse(args[0]);console.log(review(result));
 if(command==='content'){
  if(result.errors.length)throw Error(result.errors.join('\n'));
  if(!result.runtime.compatible)throw Error('Content-only export blocked by runtime drift: '+result.runtime.changes.join(', '));
  if(result.recipeSchema>(loadProfile().recipeSchema||0))throw Error('Install a verified downloadable-scene runtime first');
  if(result.sceneIds.some(id=>!loadProfile().sceneIds.includes(id)))throw Error('Scene is absent from recorded runtime');
  const profile=loadProfile(),relative='.local/content/'+result.id+'/'+result.pack.version+'.json',data=JSON.stringify(result.pack)+'\n',target=new URL(relative,root);
  if(fs.existsSync(target)&&fs.readFileSync(target,'utf8')!==data)throw Error('Immutable content version collision');
  console.log(write(relative,data));
  const report={...summary(result),elapsedMs:Math.round(performance.now()-start),runtimeVersion:profile.appVersion,runtimePackageSha256:profile.pbwSha256,delivery:'Content JSON for Refresh; not published or installed.'};
  console.log(write('.local/content/'+result.id+'/report.json',JSON.stringify(report,null,2)+'\n'));
 }
}else if(command==='direct'){
 if(args.length!==2)throw Error('Usage: direct <episode-id> <cue-plan.json>');const id=episodeId(args[0]),plan=JSON.parse(fs.readFileSync(path.resolve(args[1]))),source=JSON.parse(read('../stories/animated/'+id+'.json'));
 validateDirection(source.script,id,plan);console.log(write('direction/'+id+'.json',JSON.stringify(plan,null,2)+'\n'));console.log(review(analyse(id)));
}else throw Error('Commands: catalogue, preflight <ids...>, review <id>, content <id>, direct <id> <plan.json>');
