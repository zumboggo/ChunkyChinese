import fs from 'node:fs';
const root=new URL('../',import.meta.url),read=p=>JSON.parse(fs.readFileSync(new URL(p,root))),config=read('reading-mode.json'),pkg=read('reader/package.json');
if(typeof config.chinese!=='boolean')throw Error('reading-mode.json must specify chinese: true or false');
const media=pkg.pebble.resources.media,at=media.findIndex(a=>a.name==='FONT_CHINESE_28');
if(at>=0)fs.writeFileSync(new URL('content/chinese-font.json',root),JSON.stringify(media[at],null,2)+'\n');
if(config.chinese&&at<0)media.splice(media.findIndex(a=>a.file==='data/story.ndjson'),0,read('content/chinese-font.json'));
if(!config.chinese&&at>=0)media.splice(at,1);
fs.writeFileSync(new URL('reader/package.json',root),JSON.stringify(pkg,null,2)+'\n');
const ids={};media.forEach((a,i)=>{if(a.file.startsWith('portraits/'))ids[a.file.slice(10,-4)]=i+1;else if(a.type==='font')ids[a.name.toLowerCase().replaceAll('_','-')]=i+1;});
const aliasesUrl=new URL('pixel-reactions/native-aliases.json',root);
if(fs.existsSync(aliasesUrl))Object.assign(ids,read('pixel-reactions/native-aliases.json'));
fs.writeFileSync(new URL('reader/src/embeddedjs/art.js',root),'export default '+JSON.stringify(ids)+';\n');
const real=Object.entries(ids).filter(x=>x[1]<1000),actors=[],groups=[],groupIds=[],bases=[];
for(const [name,value] of Object.entries(ids).filter(x=>x[1]>=1000)){const actor=name.slice(0,name.indexOf('-'));if(!actors.includes(actor))actors.push(actor);}
for(const actor of actors){const entries=Object.entries(ids).filter(x=>x[0].startsWith(actor+'-')&&x[1]>=1000),base=Math.min(...entries.map(x=>x[1]));const group={names:'|'+entries.map(x=>x[0].slice(actor.length+1,-5)).join('|')+'|',ids:String.fromCharCode(...entries.map(x=>x[1]-base+1))};let i=groups.findIndex(x=>x.names===group.names&&x.ids===group.ids);if(i<0){i=groups.length;groups.push(group);}groupIds.push(i);bases.push(base);}
const code='const realNames='+JSON.stringify('|'+real.map(x=>x[0]).join('|')+'|')+',realIds='+JSON.stringify(String.fromCharCode(...real.map(x=>x[1])))+',actors='+JSON.stringify('|'+actors.join('|')+'|')+',groups='+JSON.stringify(groups.map(x=>x.names))+',values='+JSON.stringify(groups.map(x=>x.ids))+',which='+JSON.stringify(groupIds.join(''))+',bases='+JSON.stringify(String.fromCharCode(...bases))+';\n'+
'function index(names,name){const at=names.indexOf("|"+name+"|");if(at<0)return -1;let id=0;for(let i=0;i<at;i++)if(names.charCodeAt(i)===124)id++;return id;}\n'+
'export default function art(name){let i=index(realNames,name);if(i>=0)return realIds.charCodeAt(i);if(!name.endsWith("-full"))return undefined;const dash=name.indexOf("-"),a=index(actors,name.slice(0,dash));if(a<0)return undefined;const group=Number(which[a]);i=index(groups[group],name.slice(dash+1,-5));return i<0?undefined:bases.charCodeAt(a)+values[group].charCodeAt(i)-1;}\n';
fs.writeFileSync(new URL('reader/src/embeddedjs/art-native.js',root),code);
