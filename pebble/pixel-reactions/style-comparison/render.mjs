import sharp from 'sharp';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.dirname(fileURLToPath(import.meta.url));
for(let i=0;i<19;i++){const base=path.join(root,'frames','cutout-'+String(i).padStart(2,'0'));await sharp(base+'.svg').png().toFile(base+'.png');}
