import fs from 'node:fs';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {readLibrary} from './scene-library.mjs';
export const root=new URL('../',import.meta.url);
export const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const read=p=>fs.readFileSync(new URL(p,root));
export function runtimeFiles(){
 const files=['reading-mode.json','scenes/library.json','scenes/ensemble/characters.json','reader/package.json','reader/src/embeddedjs/manifest.json'];
 for(const dir of ['reader/src/c/','reader/src/embeddedjs/','reader/src/pkjs/'])for(const name of fs.readdirSync(new URL(dir,root))){
  if(!/\.(c|h|js)$/.test(name)||['story_index.h','bundled.js','episode.js','legacy.js','upgrade.js','mc.ffi.c'].includes(name))continue;
  files.push(dir+name);
 }
 const pkg=JSON.parse(read('reader/package.json'));
 for(const asset of pkg.pebble.resources.media)if(asset.file!=='data/story.ndjson'){
  const p='reader/resources/'+asset.file;if(!fs.existsSync(new URL(p,root)))throw Error('Missing runtime resource: '+p);files.push(p);
 }
 return Object.fromEntries([...new Set(files)].sort().map(p=>[p,hash(read(p))]));
}
export function compatibility(profile,current=runtimeFiles()){
 if(!profile)return {compatible:false,changes:['No verified runtime profile; run runtime:record after native verification.']};
 const changes=[...new Set([...Object.keys(current),...Object.keys(profile.files||{})])].filter(p=>current[p]!==profile.files?.[p]);
 return {compatible:changes.length===0,changes};
}
export function loadProfile(){const p=new URL('authoring/runtime-profile.json',root);return fs.existsSync(p)?JSON.parse(fs.readFileSync(p)):null;}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const reportDir=process.argv[2];if(!reportDir)throw Error('Usage: runtime-profile.mjs verification/<verified-release>');
 const base=new URL(reportDir.replace(/\/$/,'')+'/',root);
 const build=JSON.parse(fs.readFileSync(new URL('build-report.json',base))),emulator=JSON.parse(fs.readFileSync(new URL('emulator-report.json',base)));
 if(build.appVersion!==JSON.parse(read('reader/package.json')).version)throw Error('Reader app version differs from verification evidence');
 if(build.runtimeFiles&&!compatibility({files:build.runtimeFiles}).compatible)throw Error('Runtime sources changed since the verified build');
 const lib=readLibrary(),pbw=read('release/chunky-chinese-time2-'+build.episodeId+'-v'+build.appVersion+'.pbw');
 if(!build.nativeEpisodeVerified||build.pbwSha256!==hash(pbw)||emulator.pbwSha256!==build.pbwSha256||build.librarySha256!==hash(read('scenes/library.json')))throw Error('Release package/library and native verification evidence do not agree');
 if(lib.scenes.some(s=>!emulator.scenes?.some(r=>r.id===s.id)))throw Error('Full native scene verification required before recording runtime');
 const recipeReport=new URL('downloadable-report.json',base);
 const recipeEvidence=fs.existsSync(recipeReport)?JSON.parse(fs.readFileSync(recipeReport)):null;
 const recipeSchema=recipeEvidence?.pbwSha256===build.pbwSha256&&recipeEvidence.newRecipesTransferredWithoutRebuild>=2?1:0;
 const recipeActors=recipeSchema?(recipeEvidence.verifiedActors||['gorgon','boe','jeremy']):[];
 const profile={pinyinOnly:!JSON.parse(read('reading-mode.json')).chinese,recipeActors,recipeSchema,schema:1,appVersion:build.appVersion,pbwSha256:build.pbwSha256,evidence:reportDir,sceneIds:lib.scenes.map(s=>s.id),files:runtimeFiles()};
 fs.writeFileSync(new URL('authoring/runtime-profile.json',root),JSON.stringify(profile,null,2)+'\n');
 console.log('Recorded verified runtime '+profile.appVersion+'; content-only exports will reject runtime drift.');
}
