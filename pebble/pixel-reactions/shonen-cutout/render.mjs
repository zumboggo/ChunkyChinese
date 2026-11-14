import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json')));
for(const [name,a] of Object.entries(manifest.animations))for(let i=0;i<a.frameCount;i++){
 const file=path.join(root,name,String(i).padStart(2,'0'));await sharp(file+'.svg').png().toFile(file+'.png');
}
