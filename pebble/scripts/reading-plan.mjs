import fs from 'node:fs';import {initial,current,advance,phrase} from '../reader/src/embeddedjs/reader.js';import {pages} from '../reader/src/embeddedjs/layout.js';
const pack=JSON.parse(fs.readFileSync(new URL('../reader/src/pkjs/bundled.json',import.meta.url))),metrics=JSON.parse(fs.readFileSync(new URL('../content/font-metrics.json',import.meta.url)));
const measure=(t,k)=>[...t].reduce((sum,c)=>sum+metrics[k][c],0),s=initial(pack),steps=[];let count=0;
while(current(pack,s).type!=='end'){
 const n=current(pack,s),p=phrase(pack,s),wait=n.type==='animation'?6500:0;
 if(wait){if(count)steps.push({presses:count});count=0;steps.push({wait,presses:1,scene:n.id});}else count++;
 advance(pack,s,p?pages(p,s.e,measure).length:1);
}
if(count)steps.push({presses:count});console.log(JSON.stringify({episode:pack.id,steps}));
