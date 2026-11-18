// Snapshot the released watch content and shared artwork into one offline page.
import fs from 'node:fs';
import {generateVisualNovel} from './generate-visual-novel.mjs';
import {readLibrary} from './scene-library.mjs';
import art from '../reader/src/embeddedjs/art.js';
const root=new URL('../',import.meta.url);
const read=p=>fs.readFileSync(new URL(p,root),'utf8');
const catalogue=JSON.parse(read('content/catalogue.json'));
const episodes=catalogue.episodes.map(e=>JSON.parse(read('content/'+e.id+'.json')));
const header=read('reader/src/c/reaction_data.h');
const rows=name=>JSON.parse('['+header.match(new RegExp(name+'\\[\\]=\\{(.*)\\};'))[1].replaceAll('{','[').replaceAll('}',']')+']');
const config=generateVisualNovel(true), library=readLibrary();
for(const pack of episodes)for(const node of pack.nodes){
 if(node.type==='animation'&&!library.scenes.some(s=>s.id===node.id))throw Error('Missing scene '+node.id);
 if(node.type==='reaction'&&!art[node.actor+'-'+node.emotion+'-full'])throw Error('Missing reaction');
}
const data={episodes,library,art,config,actors:rows('reaction_actors'),anims:rows('reaction_anims'),sceneIds:JSON.parse(read('pixel-reactions/native-lookups.json')).scenes,resource:fs.readFileSync(new URL('reader/resources/data/reactions.bin',root)).toString('base64')};
const html=read('web/reader.html').replace('/* DATA */','const DATA='+JSON.stringify(data).replaceAll('<','\\u003c')+';').replace('/* RENDERER */',()=>read('scenes/visual-novel-renderer.js')).replace('/* PLAYER */',()=>read('web/reader.js'));
fs.writeFileSync(new URL('../../public/pebble-reader.html',import.meta.url),html);
console.log('Built offline Pebble reader: '+episodes.length+' episodes, '+Buffer.byteLength(html)+' bytes');
