import fs from 'node:fs';
import {presentationCounts} from './presentation-counts.mjs';
import {validSceneWire} from './downloadable-scene.mjs';
import {exportEpisode} from './export.mjs';
import {episodeId} from './episode-target.mjs';
import {readLibrary} from './scene-library.mjs';
import {loadDirection} from './story-direction.mjs';
import {validate} from '../reader/src/embeddedjs/transfer.js';
import {pages} from '../reader/src/embeddedjs/layout.js';
import art from '../reader/src/embeddedjs/art.js';
import {root,loadProfile,compatibility} from './runtime-profile.mjs';
const read=p=>fs.readFileSync(new URL(p,root));
export function analyse(id,overrides={}){
 episodeId(id);const result={id,errors:[],missingArt:[],missingGlyphs:[],shots:[],runtime:compatibility(loadProfile())};
 let source;try{source=overrides.source||JSON.parse(read('../stories/animated/'+id+'.json'));result.pack=exportEpisode(source,id,overrides.direction);}catch(e){result.errors.push(e.message);return result;}
 const pack=result.pack,glyphs=read('content/glyphs.txt').toString();
 result.missingArt=pack.art.filter(n=>!art[n]&&!art[n+'-full']);
 result.missingGlyphs=[...new Set(pack.nodes.flatMap(n=>[...(n.phrases||[]),...(n.options||[]).flatMap(o=>o.phrases)]).flatMap(p=>[...p.zh+p.py+p.en]).filter(c=>!glyphs.includes(c)))];
 if(result.missingArt.length)result.errors.push('Missing portraits: '+result.missingArt.join(', '));
 if(result.missingGlyphs.length)result.errors.push('Missing glyphs: '+result.missingGlyphs.join(''));
 try{validate(pack,glyphs,n=>!!art[n]||!!art[n+'-full'],validSceneWire);}catch(e){result.errors.push(e.message);}
 const metrics=JSON.parse(read('content/font-metrics.json'));
 try{
  const measure=(s,k)=>[...s].reduce((v,c)=>{if(metrics[k][c]===undefined)throw Error('Unmeasured glyph: '+c);return v+metrics[k][c];},0);
  for(const n of pack.nodes)for(const p of [...(n.phrases||[]),...(n.options||[]).flatMap(o=>o.phrases)])for(const mode of [0,1])for(const page of pages(p,mode,measure)){
   if(page.py.length>2||page.lower.length>(mode?2:3)||page.py.some(s=>measure(s,'py')>184)||page.lower.some(s=>measure(s,mode?'zh':'en')>184))throw Error('Phrase exceeds native layout');
  }
 }catch(e){result.errors.push(e.message);}
 const wireRecord=x=>JSON.stringify(x).replace(/[^\x20-\x7e]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'));
 const meta={...pack,nodeCount:pack.nodes.length};delete meta.nodes;
 const records=[meta,...pack.nodes].map(wireRecord);result.wireBytes=records.reduce((a,s)=>a+s.length+1,0);result.maxRecordBytes=Math.max(...records.map(s=>s.length+1));
 if(result.wireBytes>65536||result.maxRecordBytes>2048||pack.nodes.length>160)result.errors.push('Episode exceeds reader transfer/resource limits');
 const cues=new Map(((overrides.direction===undefined?loadDirection(id):overrides.direction)?.cues||[]).map(c=>[c.anchor,c]));let previous='',section='opening';
 for(const line of source.script.split('\n').map(s=>s.trim())){
  const label=line.match(/^label (\S+)$/);if(label){if(cues.has(label[1]))result.shots.push({anchor:label[1],scene:cues.get(label[1]).scene,...(cues.get(label[1]).recipe?{recipe:cues.get(label[1]).recipe}:{}),section,passage:previous});else section=label[1];}
  const speech=line.match(/^\w+(?: \[[^\]]+\])?: (.+)$/);if(speech)previous=speech[1];
 }
 const assets=JSON.parse(read('reader/package.json')).pebble.resources.media;
 let used=0,unused=0;for(const [i,a] of assets.entries())if(a.file.startsWith('portraits/')){const size=read('reader/resources/'+a.file).length;const needed=pack.art.some(n=>(art[n]||art[n+'-full'])===i+1);if(needed)used+=size;else unused+=size;}
 result.portraitStorage={usedBytes:used,unusedBytes:unused,note:'Stored RLE resource bytes, not runtime heap savings.'};
 result.sceneIds=[...new Set(result.shots.filter(s=>!s.recipe).map(s=>s.scene))];const library=readLibrary();result.totalScenes=library.scenes.length;result.recipeSchema=result.shots.some(s=>s.recipe)?1:0;
 const duration=s=>s.duration+(s.establish||0);result.reviewPlaybackSeconds=library.scenes.filter(s=>result.sceneIds.includes(s.id)).reduce((n,s)=>n+duration(s),0)/1000+result.shots.filter(s=>s.recipe).reduce((n,s)=>n+s.recipe.keys.at(-1)[0],0)/1000;result.fullLibraryPlaybackSeconds=library.scenes.reduce((n,s)=>n+duration(s),0)/1000;
 result.warnings=result.shots.length?[]:['No animation cues are authored for this episode.'];
 try{result.presentation=presentationCounts(pack);if(result.presentation.animations.min<5)result.warnings.push('Some routes have fewer than five animated moments.');if(result.presentation.reactions.min<20||result.presentation.reactions.max>25)result.warnings.push('Reaction-shot count falls outside the 20–25 per-route target; review pacing.');}catch(e){result.errors.push(e.message);}
 return result;
}
export function summary(result){const {pack,...rest}=result;return {...rest,version:pack?.version,nodeCount:pack?.nodes.length};}
