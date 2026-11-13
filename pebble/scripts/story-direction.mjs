import fs from 'node:fs';
import {encodeScene} from './downloadable-scene.mjs';
import {readLibrary} from './scene-library.mjs';
export function loadDirection(id){
 if(!/^[a-z0-9-]+$/.test(id))throw Error('Invalid episode ID');
 const path=new URL('../direction/'+id+'.json',import.meta.url);
 return fs.existsSync(path)?JSON.parse(fs.readFileSync(path)):null;
}
export function validateDirection(script,id,direction){
 if(!direction)return new Map();
 if(direction.schema!==1||direction.episode!==id||!Array.isArray(direction.cues))throw Error('Invalid story direction');
 const scenes=new Set(readLibrary().scenes.map(s=>s.id)),labels=new Map();
 for(const raw of script.split('\n')){const m=raw.trim().match(/^label (\S+)$/);if(m)labels.set(m[1],(labels.get(m[1])||0)+1);}
 for(const actor of direction.animatedCast||[]){if(!['Boe','Jeremy'].includes(actor)||!direction.cues.some(c=>c.scene.startsWith(actor.toLowerCase()+'-')))throw Error('Missing animated cast direction: '+actor);}
 const cues=new Map();
 const commands=script.split('\n').map(s=>s.trim()).filter(Boolean);
 for(const cue of direction.cues){
  if(labels.get(cue.anchor)!==1)throw Error('Missing or duplicate story anchor: '+cue.anchor);
  const position=commands.indexOf('label '+cue.anchor);
  if(!/^\w+(?: \[[^\]]+\])?: .+$/.test(commands[position-1]||''))throw Error('Story anchor must follow a complete passage: '+cue.anchor);
  if(cues.has(cue.anchor))throw Error('Duplicate cue: '+cue.anchor);
  if(cue.recipe){if(scenes.has(cue.scene)||!/^download-[a-z0-9-]+$/.test(cue.scene))throw Error('Downloadable scenes need a distinct download- ID');cues.set(cue.anchor,{id:cue.scene,recipe:encodeScene(cue.recipe)});}
  else {if(!scenes.has(cue.scene))throw Error('Unsupported scene: '+cue.scene);cues.set(cue.anchor,cue.scene);}
 }
 return cues;
}
