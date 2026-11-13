import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)('sharp');
const root=path.resolve(import.meta.dirname,'..');
const catalogue=JSON.parse(fs.readFileSync(path.join(root,'art/reaction-atlases.json')));
const dest=path.join(root,'reader/resources/images');
for(const atlas of catalogue.atlases){
 const source=path.join(root,'art',atlas.file),meta=await sharp(source).metadata();
 if(atlas.emotions.length!==atlas.columns*atlas.rows)throw Error('Incomplete atlas '+atlas.file);
 for(const [i,emotion] of atlas.emotions.entries()){
  const name=atlas.actor+'-'+emotion;
  const left=Math.round(i%atlas.columns*meta.width/atlas.columns),top=Math.round(Math.floor(i/atlas.columns)*meta.height/atlas.rows);
  const width=Math.round((i%atlas.columns+1)*meta.width/atlas.columns)-left,height=Math.round((Math.floor(i/atlas.columns)+1)*meta.height/atlas.rows)-top;
  for(const size of [64,48])await sharp(source).extract({left,top,width,height}).resize(size,size,{kernel:'nearest'}).flatten({background:'#fff'}).png({palette:true,colours:16,dither:0}).toFile(path.join(dest,name+'-'+size+'.png'));
  // Fit the whole portrait, including horn collar, without cropping its sides.
  const full=await sharp(path.join(dest,name+'-64.png')).resize(200,200,{kernel:'nearest'}).extend({top:14,bottom:14,left:0,right:0,background:'#fff'}).png({palette:true,colours:16,dither:0}).toBuffer();
  for(let tile=0;tile<4;tile++)await sharp(full).extract({left:0,top:tile*57,width:200,height:57}).png({palette:true,colours:16,dither:0}).toFile(path.join(dest,name+'-full-'+tile+'.png'));
 }
}
await import('./pack-watch-portraits.mjs');
