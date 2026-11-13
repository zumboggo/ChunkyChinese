import {createRequire} from 'node:module';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);const sharp=require('sharp');const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const names=['Hannah-neutral','Hannah-warm','Hannah-worried','Hannah-sad','Hannah-determined','Hannah-excited','YoungAlden-curious','YoungAlden-worried','YoungAlden-confused','YoungAlden-thoughtful','Alden-thoughtful','Alden-sad','Alden-determined','Alden-neutral','YoungAlden-neutral','Hannah-calm'];
const dest=path.join(root,'reader/resources/images');fs.mkdirSync(dest,{recursive:true});
const atlas=path.join(root,'art/cast-atlas.png'),meta=await sharp(atlas).metadata();
for(let i=0;i<names.length;i++)for(const size of [64,48]){
 const left=Math.round((i%4)*meta.width/4),top=Math.round(Math.floor(i/4)*meta.height/4),width=Math.round((i%4+1)*meta.width/4)-left,height=Math.round((Math.floor(i/4)+1)*meta.height/4)-top;
 await sharp(atlas).extract({left,top,width,height}).resize(size,size,{kernel:'nearest'}).flatten({background:'#ffffff'}).png({palette:true,colours:16,dither:0}).toFile(path.join(dest,`${names[i]}-${size}.png`));
}
for(const name of ['opening','closing'])if(fs.existsSync(path.join(root,`art/${name}.png`)))await sharp(path.join(root,`art/${name}.png`)).resize(200,228,{fit:'cover',kernel:'nearest'}).extract({left:0,top:0,width:200,height:163}).png({palette:true,colours:16,dither:0}).toFile(path.join(dest,name+'.png'));
const pkgPath=path.join(root,'reader/package.json'),pkg=JSON.parse(fs.readFileSync(pkgPath));
pkg.name='chunky-chinese-pebble';pkg.author='David Hepting';pkg.pebble.displayName='Chunky Chinese';pkg.pebble.targetPlatforms=['emery'];pkg.pebble.watchapp.watchface=false;pkg.pebble.messageKeys=['COMMAND','DATA','OFFSET','TOTAL','CHECKSUM','VERSION','STATUS'];
pkg.pebble.resources.media=[];let ids={};
for(const file of fs.readdirSync(dest).sort()){if(!file.endsWith('.png'))continue;const name=file.slice(0,-4);pkg.pebble.resources.media.push({type:'bitmap',name:'IMAGE_'+name.replaceAll('-','_').toUpperCase(),file:'images/'+file,memoryFormat:'4BitPalette',spaceOptimization:'memory'});ids[name]=pkg.pebble.resources.media.length;}
fs.mkdirSync(path.join(root,'reader/resources/fonts'),{recursive:true});
const glyphs=fs.readFileSync(path.join(root,'content/glyphs.txt'),'utf8');
for(const [name,size] of [['latin',24],['latin',20],['chinese',28]]){
 fs.copyFileSync(path.join(root,'reader/src/embeddedjs/assets',name+'.ttf'),path.join(root,'reader/resources/fonts',name+'.ttf'));
 pkg.pebble.resources.media.push({type:'font',extended:true,name:'FONT_'+name.toUpperCase()+'_'+size,file:'fonts/'+name+'.ttf',characterRegex:'['+[...glyphs].filter(c=>name==='chinese'||!/[\u3400-\u9fff]/.test(c)).map(c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0')).join('')+']'});
 ids['font-'+name+'-'+size]=pkg.pebble.resources.media.length;
}
pkg.pebble.configPage='settings.html';pkg.pebble.capabilities=['configurable'];
pkg.pebble.usesPermissions=[{name:'Internet',parameters:{domains:['raw.githubusercontent.com']},reason:'Download your selected Chinese episode package.',required:false}];
fs.writeFileSync(pkgPath,JSON.stringify(pkg,null,2)+'\n');fs.writeFileSync(path.join(root,'reader/src/embeddedjs/art.js'),'export default '+JSON.stringify(ids)+';\n');
console.log('Prepared',Object.keys(ids).length,'bitmap resources');
