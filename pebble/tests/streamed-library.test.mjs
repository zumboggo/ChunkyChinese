import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import vm from 'node:vm';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import art from '../reader/src/embeddedjs/art.js';
const root=fileURLToPath(new URL('../',import.meta.url));
test('streamed lookup resolves every old/new alias and rejects hash collisions',()=>{
 const b=fs.readFileSync(path.join(root,'reader/resources/data/library.bin'));assert.equal(b.toString('ascii',0,4),'LUT1');const count=b.readUInt16LE(4),texts=b.readUInt16LE(6);
 const text=id=>{const p=8+count*8+id*6;return b.toString('utf8',b.readUInt32LE(p),b.readUInt32LE(p)+b.readUInt16LE(p+4));};
 const entries=Array.from({length:count},(_,i)=>({hash:b.readUInt32LE(8+i*8),id:b.readUInt16LE(12+i*8),value:b.readUInt16LE(14+i*8)}));
 assert.ok(entries.every(e=>e.id<255),'Lookup result must remain exactly representable on XS float builds');
 const io={libraryFind:(h,n)=>{const e=entries.filter(e=>e.hash===h)[n];return e?((e.id+1)<<16)|e.value:0;},libraryText:text};
 const source=fs.readFileSync(path.join(root,'reader/src/embeddedjs/library-native.js'),'utf8').replace(/^import .*;\n/,'').replace('export default function','function');const lookup=vm.runInNewContext(source+';lookup',{io});
 for(const [name,id] of Object.entries(art))assert.equal(lookup(0,name),id,name);
 const scenes=JSON.parse(fs.readFileSync(path.join(root,'scenes/library.json'))).scenes;for(const scene of scenes)assert.equal(lookup(1,scene.id),scene.nativeId);
 const hash=s=>{let h=5381;for(const c of s)h=((h*33)^c.charCodeAt(0))&65535;return h;};let collision;
 for(let i=0;i<1000000;i++)if(entries.some(e=>e.hash===hash('0|missing-'+i))){collision='missing-'+i;break;}
 assert.ok(collision);assert.equal(lookup(0,collision),0);assert.equal(lookup(0,'not-a-portrait'),0);assert.equal(lookup(1,'not-a-scene'),0);
 // Run the real C decoder against every string and every collision bucket.
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'watch-library-'));
 try{
  fs.writeFileSync(path.join(dir,'pebble.h'),'#include <stdint.h>\n#include <stddef.h>\n#include <stdbool.h>\n#include <stdlib.h>\n#include <stdio.h>\n#include <string.h>\n#define RESOURCE_ID_LIBRARY 1\nstatic FILE *resource;\nstatic int resource_get_handle(int n){return n;}\nstatic size_t resource_load_byte_range(int n,uint32_t at,void *out,size_t count){(void)n;fseek(resource,at,SEEK_SET);return fread(out,1,count,resource);}\nstatic uint32_t heap_bytes_free(void){return 0;}\n');
  let c='#include '+JSON.stringify(path.join(root,'reader/src/c/library_resource.c'))+'\nint main(void){resource=fopen('+JSON.stringify(path.join(root,'reader/resources/data/library.bin'))+',"rb");if(!resource)return 2;char *s;\n';
  for(let i=0;i<texts;i++)c+='s=libraryText('+i+');if(!s||strcmp(s,'+JSON.stringify(text(i))+'))return 3;free(s);\n';
  entries.forEach((e,i)=>{const n=entries.slice(0,i).filter(x=>x.hash===e.hash).length;c+='if(libraryFind('+e.hash+','+n+')!='+(((e.id+1)<<16)|e.value)+')return 4;\n';});
  c+='if(libraryText('+texts+')!=NULL)return 5;fclose(resource);return 0;}';fs.writeFileSync(path.join(dir,'check.c'),c);
  execFileSync('cc',['-I',dir,path.join(dir,'check.c'),'-o',path.join(dir,'check')]);execFileSync(path.join(dir,'check'));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
