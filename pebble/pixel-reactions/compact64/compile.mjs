import {rolldown} from '../../node_modules/rolldown/dist/index.mjs';
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const count=Number(process.argv[2]);if(![8,16].includes(count))throw Error('Pass 8 or 16');
const root=fileURLToPath(new URL(`../.local/compact${count}-reader/src/embeddedjs/`,import.meta.url));
const bundle=await rolldown({input:path.join(root,'main.js'),external:id=>!id.startsWith('.')&&!path.isAbsolute(id),treeshake:true});
try{const result=await bundle.generate({format:'es',minify:true});fs.mkdirSync(path.join(root,'compiled'),{recursive:true});fs.writeFileSync(path.join(root,'compiled/main.js'),result.output[0].code);}finally{await bundle.close();}
