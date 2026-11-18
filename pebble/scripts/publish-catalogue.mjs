// Rebuild metadata from explicitly published watch feeds, never phone drafts.
import fs from 'node:fs';
import {createRequire} from 'node:module';
const root=new URL('../content/',import.meta.url);
const ids=JSON.parse(fs.readFileSync(new URL('catalogue-source.json',root)));
const episodes=ids.map(id=>{
 if(!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*-\d+(?:-v\d+)?$/.test(id))throw Error('Invalid episode ID');
 const p=JSON.parse(fs.readFileSync(new URL(id+'.json',root)));
 if(p.id!==id||!p.number||!/^\w{12}$/.test(p.version)||p.chinese!==false)throw Error('Publish a pinyin-only watch feed first: '+id);
 return {id,number:p.number,title:p.title,version:p.version};
});
episodes.sort((a,b)=>a.number-b.number);
if(new Set(episodes.map(e=>e.number)).size!==episodes.length)throw Error('Duplicate episode number');
const catalogue={schema:1,episodes};
const service=createRequire(import.meta.url)('../reader/src/pkjs/catalogue.js')({},null,'');
service.validate(catalogue);
for(const first of new Set(episodes.map(e=>String(Math.floor((e.number-1)/10)*10+1))))for(const offset of [0,5]){
 if(JSON.stringify(service.page(catalogue,first,offset,false)).length>900)throw Error('Shorten catalogue titles in range '+first+' to fit the watch message budget');
}
const json=JSON.stringify(catalogue,null,2)+'\n',target=new URL('catalogue.json',root);
if(process.argv.includes('--check')){if(fs.readFileSync(target,'utf8')!==json)throw Error('Catalogue stale: run node scripts/publish-catalogue.mjs');}
else fs.writeFileSync(target,json);
console.log('Published catalogue metadata: '+episodes.length+' episodes');
