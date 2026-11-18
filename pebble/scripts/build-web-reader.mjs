// Build from a self-contained snapshot of the approved watch renderer and assets.
import fs from 'node:fs';
import {phoneEpisode} from '../web/phone-episodes.mjs';
const root=new URL('../',import.meta.url);
const read=p=>fs.readFileSync(new URL(p,root),'utf8');
const data=JSON.parse(read('web/assets.json'));
const snapshots=new Map(data.episodes.map(p=>[p.number,p]));
const catalog=JSON.parse(read('../public/stories/animated/catalog.json')).filter(e=>e.category==='super-supportive').sort((a,b)=>a.episode-b.episode);
if(new Set(catalog.map(e=>e.episode)).size!==catalog.length)throw Error('Duplicate episode number');
data.episodes=catalog.map(e=>snapshots.get(e.episode)||phoneEpisode(JSON.parse(read('../public/stories/animated/'+e.path)),e));
for(const pack of data.episodes)for(const node of pack.nodes){
 if(node.type==='animation'&&!data.library.scenes.some(s=>s.id===node.id))throw Error('Missing scene '+node.id);
 if(node.type==='reaction'&&!data.art[node.actor+'-'+node.emotion+'-full'])throw Error('Missing reaction');
}
const html=read('web/reader.html').replace('/* DATA */','const DATA='+JSON.stringify(data).replaceAll('<','\\u003c')+';').replace('/* RENDERER */',()=>read('web/visual-novel-renderer.js')).replace('/* PLAYER */',()=>read('web/reader.js'));
fs.writeFileSync(new URL('../../public/pebble-reader.html',import.meta.url),html);
console.log('Built offline Pebble reader: '+data.episodes.length+' episodes, '+Buffer.byteLength(html)+' bytes');
