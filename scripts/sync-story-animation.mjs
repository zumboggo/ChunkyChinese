import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=resolve(import.meta.dirname,'..');
const source=resolve(process.argv.find(a=>a.startsWith('--source='))?.slice(9)||resolve(root,'../../Learning is Fun/implementation'));
const check=process.argv.includes('--check');
const engine=['story-engine','acting-library','scene-beats','character-builder'].flatMap(n=>['js','d.ts'].map(ext=>`functions/learning-content/src/${n}.${ext}`));
const components=['BackgroundLibrary.tsx','CartoonActor.tsx','RefinedFace.tsx','MountedActor.tsx','PuppetActor.tsx','StoryStage.tsx','action-motion.ts','scene-motion.ts','character-geometry.ts','story-player.css','ActingLibrary.tsx','ActionLibrary.tsx','CharacterBuilder.tsx','SceneBeatLibrary.tsx','ChoiceWorkshop.tsx','authoring-tools.ts'];
const entries=[...engine.map(path=>[path,`engine/${path.split('/').at(-1)}`]),...components.map(name=>[`src/components/animated/${name}`,`components/${name}`])];
const manifest={repository:'https://github.com/zumboggo/Learningisfun',commit:execFileSync('git',['rev-parse','HEAD'],{cwd:source,encoding:'utf8'}).trim(),files:[]};
for(const [path,dest] of entries){
 const original=readFileSync(resolve(source,path),'utf8');
 const content=original.replaceAll('../../../functions/learning-content/src/','../engine/');
 const target=resolve(root,'src/game/animation/shared',dest);
 if(check){if(readFileSync(target,'utf8')!==content)throw Error(`Shared animation drift: ${dest}`);}
 else{mkdirSync(dirname(target),{recursive:true});writeFileSync(target,content);}
 manifest.files.push({source:path,target:dest,sha256:createHash('sha256').update(original).digest('hex')});
}
if(!check)writeFileSync(resolve(root,'src/game/animation/shared/manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(`${check?'Verified':'Synced'} ${entries.length} shared animation files at ${manifest.commit}`);
