import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),sharp=require('sharp');
const root=path.resolve(import.meta.dirname,'..'),pkgPath=path.join(root,'reader/package.json'),pkg=JSON.parse(fs.readFileSync(pkgPath));
const names=fs.readdirSync(path.join(root,'reader/resources/images')).filter(f=>f.endsWith('-full-0.png')).map(f=>f.replace('-full-0.png','')).sort();
const rawDir=path.join(root,'reader/resources/portraits');fs.mkdirSync(rawDir,{recursive:true});
const ids={},media=[];
for(const name of [...names,'opening','closing']){
 let input;
 if(name==='opening'||name==='closing')input=sharp(path.join(root,'reader/resources/images',name+'.png'));
 else {const tiles=await Promise.all([0,1,2,3].map(i=>sharp(path.join(root,'reader/resources/images',name+'-full-'+i+'.png')).toBuffer()));input=sharp({create:{width:200,height:228,channels:3,background:'#fff'}}).composite(tiles.map((input,i)=>({input,left:0,top:i*57})));}
 const {data,info}=await input.removeAlpha().raw().toBuffer({resolveWithObject:true});
 const bytes=[];let previous=null,repeat=0;
 const flush=()=>{if(previous)bytes.push(repeat,previous.length/2,...previous);};
 for(let y=0;y<info.height;y++){
  const row=[];let color=-1,count=0;
  for(let x=0;x<200;x++){const i=(y*200+x)*info.channels,c=0xc0|(Math.round(data[i]/85)<<4)|(Math.round(data[i+1]/85)<<2)|Math.round(data[i+2]/85);if(c===color)count++;else{if(count)row.push(count,color);color=c;count=1;}}
  row.push(count,color);
  if(previous&&row.join(',')===previous.join(',')&&repeat<255)repeat++;else{flush();previous=row;repeat=1;}
 }
 flush();const key=names.includes(name)?name+'-full':name;
 fs.writeFileSync(path.join(rawDir,key+'.rle'),Buffer.from(bytes));
 media.push({type:'raw',name:'PORTRAIT_'+key.replaceAll('-','_').toUpperCase(),file:'portraits/'+key+'.rle'});ids[key]=media.length;
}
for(const a of pkg.pebble.resources.media.filter(a=>a.type!=='bitmap'&&!a.file.startsWith('portraits/'))){media.push(a);if(a.type==='font')ids[a.name.toLowerCase().replaceAll('_','-')]=media.length;}
pkg.pebble.resources.media=media;fs.writeFileSync(pkgPath,JSON.stringify(pkg,null,2)+'\n');fs.writeFileSync(path.join(root,'reader/src/embeddedjs/art.js'),'export default '+JSON.stringify(ids)+';\n');
console.log('Packed',names.length,'portraits and two cards; raw bytes',fs.readdirSync(rawDir).reduce((sum,f)=>sum+fs.statSync(path.join(rawDir,f)).size,0));
