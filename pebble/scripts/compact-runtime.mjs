// Keep authored JS testable in Node; watch-only lookups and long UI strings stream from ROM.
import {rolldown} from 'rolldown';
import {parse} from 'acorn';
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const base=fileURLToPath(new URL('../',import.meta.url)),root=path.join(base,'reader/src/embeddedjs');
const strings=[],map=[];
function textId(s){let i=strings.indexOf(s);if(i<0){i=strings.length;strings.push(s);}return i;}
function hash(s){let n=5381;for(const b of Buffer.from(s))n=((n*33)^b)&65535;return n;}
function key(kind,name,value){const s=kind+'|'+name;map.push({hash:hash(s),text:textId(s),value});}
const art=(await import(path.join(root,'art.js')+'?build='+Date.now())).default;
for(const [name,id] of Object.entries(art))key(0,name,id);
const scenes=JSON.parse(fs.readFileSync(path.join(base,'scenes/library.json'))).scenes;
const sceneText=scenes.map(s=>[textId(s.name),textId(s.group)]);
for(const s of scenes)key(1,s.id,s.nativeId);
const plugin={name:'streamed-watch-constants',load(id){
 if(id===path.join(root,'art-native.js'))return "import lookup from './library-native.js';export default name=>lookup(0,name)||undefined;";
 if(id===path.join(root,'scenes-native.js'))return "import io from './native.js';import lookup from './library-native.js';const names="+JSON.stringify(String.fromCharCode(...sceneText.map(e=>e[0])))+",groups="+JSON.stringify(String.fromCharCode(...sceneText.map(e=>e[1])))+";export const sceneCount="+scenes.length+";export const sceneId=name=>lookup(1,name);export const sceneName=id=>io.libraryText(names.charCodeAt(id-1));export const sceneGroup=id=>io.libraryText(groups.charCodeAt(id-1));";
},transform(code,id){
 if(!id.startsWith(root+path.sep)||id.endsWith('/native.js'))return;
 if(id===path.join(root,'main.js'))code="import BootTimer from 'timer';\n"+code.replace('startReader();', 'BootTimer.set(startReader);');
 const changes=[];function visit(n,parent,depth){if(!n||typeof n!=='object')return;const next=depth+(['FunctionDeclaration','FunctionExpression','ArrowFunctionExpression'].includes(n.type)?1:0);
  if(n.type==='Literal'&&typeof n.value==='string'&&n.value.length>=12&&depth>0&&!(parent?.type==='Property'&&parent.key===n&&!parent.computed))changes.push([n.start,n.end,'__watchIO.libraryText('+textId(n.value)+')']);
  for(const [k,v] of Object.entries(n)){if(k==='start'||k==='end')continue;if(Array.isArray(v))v.forEach(c=>visit(c,n,next));else if(v&&typeof v==='object')visit(v,n,next);}
 }visit(parse(code,{ecmaVersion:'latest',sourceType:'module'}),null,0);
 if(!changes.length)return;for(const [a,b,value] of changes.sort((a,b)=>b[0]-a[0]))code=code.slice(0,a)+value+code.slice(b);
 return "import __watchIO from './native.js';\n"+code;
}};
const bundle=await rolldown({input:path.join(root,'main.js'),plugins:[plugin],external:id=>!id.startsWith('.')&&!path.isAbsolute(id),treeshake:true});
try{const result=await bundle.generate({format:'es',minify:true});fs.mkdirSync(path.join(root,'compiled'),{recursive:true});fs.writeFileSync(path.join(root,'compiled/main.js'),result.output[0].code);}finally{await bundle.close();}
// Keep packed results exact on the watch's single-precision number build.
if(map.some(e=>e.text>=255||e.value<1||e.value>65535))throw Error('Lookup packing limit exceeded');
map.sort((a,b)=>a.hash-b.hash);const chunks=strings.map(s=>Buffer.from(s+'\0')),head=8+map.length*8+strings.length*6;let size=head+chunks.reduce((n,b)=>n+b.length,0);const data=Buffer.alloc(size);data.write('LUT1');data.writeUInt16LE(map.length,4);data.writeUInt16LE(strings.length,6);
map.forEach((v,i)=>{let at=8+i*8;data.writeUInt32LE(v.hash,at);data.writeUInt16LE(v.text,at+4);data.writeUInt16LE(v.value,at+6);});let offset=head;chunks.forEach((b,i)=>{let at=8+map.length*8+i*6;data.writeUInt32LE(offset,at);data.writeUInt16LE(b.length-1,at+4);b.copy(data,offset);offset+=b.length;});
fs.writeFileSync(path.join(base,'reader/resources/data/library.bin'),data);
fs.mkdirSync(path.join(base,'.local'),{recursive:true});fs.writeFileSync(path.join(base,'.local/library-resource.json'),JSON.stringify({strings,map,resourceBytes:size},null,2)+'\n');
