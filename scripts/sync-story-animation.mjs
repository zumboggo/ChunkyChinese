import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {weedOptionAOverlay} from './weed-option-a-overlay.mjs';
const root=resolve(import.meta.dirname,'..');
const source=resolve(process.argv.find(a=>a.startsWith('--source='))?.slice(9)||resolve(root,'../../Learning is Fun/implementation'));
const check=process.argv.includes('--check');
const engine=['story-engine','acting-library','scene-beats','character-builder'].flatMap(n=>['js','d.ts'].map(ext=>`functions/learning-content/src/${n}.${ext}`));
const components=['ActivityRunner.tsx','activity-motion.ts','BackgroundLibrary.tsx','CartoonActor.tsx','RefinedFace.tsx','MountedActor.tsx','PuppetActor.tsx','StoryStage.tsx','action-motion.ts','scene-motion.ts','camera-framing.ts','scene-sound.ts','StoryAtmosphere.tsx','character-geometry.ts','story-player.css','ActingLibrary.tsx','ActionLibrary.tsx','CharacterBuilder.tsx','SceneBeatLibrary.tsx','ChoiceWorkshop.tsx','authoring-tools.ts'];
const entries=[...engine.map(path=>[path,`engine/${path.split('/').at(-1)}`]),...components.map(name=>[`src/components/animated/${name}`,`components/${name}`])];
const manifest={repository:'https://github.com/zumboggo/Learningisfun',commit:execFileSync('git',['rev-parse','HEAD'],{cwd:source,encoding:'utf8'}).trim(),files:[]};
for(const [path,dest] of entries){
 const original=readFileSync(resolve(source,path),'utf8');
 let content=original.replaceAll('../../../functions/learning-content/src/','../engine/');
 // Chunky Chinese owns motion preferences in episode Settings. Keep upstream
 // renderer updates from restoring the old control between scene and dialogue.
 if(dest==='components/StoryStage.tsx')content=content
  .replace('motionPaused,onMotionPause,hideMotionControl=false','motionPaused=false')
  .replace(';onMotionPause?:(paused:boolean)=>void;hideMotionControl?:boolean','')
  .replace('const [localPaused,setLocalPaused]=useState(false),[hidden,setHidden]','const [hidden,setHidden]')
  .replace('const paused=motionPaused??localPaused,setPaused=onMotionPause??setLocalPaused;','const paused=motionPaused;')
  .split('\n').filter(line=>!line.includes('{!hideMotionControl&&')).join('\n');
 if(dest==='components/story-player.css')content=content.split('\n').filter(line=>!line.startsWith('.story-motion-toggle{')).join('\n');
 if(dest==='components/CartoonActor.tsx')content=weedOptionAOverlay(content);
 const target=resolve(root,'src/game/animation/shared',dest);
 if(check){if(readFileSync(target,'utf8')!==content)throw Error(`Shared animation drift: ${dest}`);}
 else{mkdirSync(dirname(target),{recursive:true});writeFileSync(target,content);}
 manifest.files.push({source:path,target:dest,sha256:createHash('sha256').update(original).digest('hex')});
}
if(!check)writeFileSync(resolve(root,'src/game/animation/shared/manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(`${check?'Verified':'Synced'} ${entries.length} shared animation files at ${manifest.commit}`);
