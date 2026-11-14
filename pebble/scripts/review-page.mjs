import fs from 'node:fs';
import {root} from './runtime-profile.mjs';
const read=p=>fs.readFileSync(new URL(p,root),'utf8');
export function reviewPage(data){
 const header=read('reader/src/c/reaction_data.h');
 const rows=name=>JSON.parse('['+header.match(new RegExp(name+'\\[\\]=\\{(.*)\\};'))[1].replaceAll('{','[').replaceAll('}',']')+']');
 const config=JSON.parse(read('scenes/visual-novel.json')),resource=fs.readFileSync(new URL('reader/resources/data/reactions.bin',root)).toString('base64');
 const renderer=read('scenes/visual-novel-renderer.js')+'\nconst VN=visualNovel('+JSON.stringify(config)+','+JSON.stringify(resource)+','+JSON.stringify(rows('reaction_actors'))+','+JSON.stringify(rows('reaction_anims'))+');';
 return read('authoring/review.template.html').replace('/* DATA */','const REVIEW='+JSON.stringify(data).replaceAll('<','\\u003c')+';').replace('/* RENDERERS */',()=>renderer).replace('/* CONTROLS */',()=>read('authoring/review-ui.js'));
}
