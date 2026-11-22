// Build from a self-contained snapshot of the approved watch renderer and assets.
import fs from 'node:fs';
import {phoneEpisode,attachPixelDirection} from '../web/phone-episodes.mjs';
const root=new URL('../',import.meta.url);
const read=p=>fs.readFileSync(new URL(p,root),'utf8');
const data=JSON.parse(read('web/assets.json'));
data.comicSheets=JSON.parse(read('../src/game/animation/comic/sheets.json'));
const snapshots=new Map(data.episodes.map(p=>[p.number,p]));
const catalog=JSON.parse(read('../public/stories/animated/catalog.json')).filter(e=>e.category==='super-supportive'&&e.pebble!==false).sort((a,b)=>a.episode-b.episode);
if(new Set(catalog.map(e=>e.episode)).size!==catalog.length)throw Error('Duplicate episode number');
data.episodes=catalog.map(e=>snapshots.get(e.episode)||phoneEpisode(JSON.parse(read('../public/stories/animated/'+e.path)),e));
for(const entry of catalog){
 const directionPath=new URL('../src/game/animation/pixel/supportive-'+entry.episode+'.json',root);
 if(fs.existsSync(directionPath))attachPixelDirection(data.episodes.find(p=>p.number===entry.episode),JSON.parse(read('../public/stories/animated/'+entry.path)),JSON.parse(fs.readFileSync(directionPath,'utf8')));
}
for(const pack of data.episodes)for(const node of pack.nodes){
 if(node.pixelShot?.comic&&!data.comicSheets[node.pixelShot.comic.sheet])throw Error('Missing comic sheet');
 if(node.type==='animation'&&!data.library.scenes.some(s=>s.id===node.id))throw Error('Missing scene '+node.id);
 if(node.type==='reaction'&&!data.art[node.actor+'-'+node.emotion+'-full'])throw Error('Missing reaction');
}
const usedSheets=new Set(data.episodes.flatMap(p=>p.nodes.flatMap(n=>n.pixelShot?.comic?[n.pixelShot.comic.sheet]:[])));
data.comicSheets=Object.fromEntries(Object.entries(data.comicSheets).filter(([id])=>usedSheets.has(id)));
const html=read('web/reader.html').replace('/* DATA */','const DATA='+JSON.stringify(data).replaceAll('<','\\u003c')+';').replace('/* RENDERER */',()=>read('web/visual-novel-renderer.js').replace('export function visualNovel','function visualNovel')).replace('/* PLAYER */',()=>read('web/reader.js'));
fs.writeFileSync(new URL('../../public/pebble-reader.html',import.meta.url),html);
console.log('Built offline Pebble reader: '+data.episodes.length+' episodes, '+Buffer.byteLength(html)+' bytes');
