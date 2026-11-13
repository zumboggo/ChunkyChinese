import { readFile, writeFile } from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const template=await readFile(new URL('preview/ensemble.template.html',root),'utf8');
const data=JSON.parse(await readFile(new URL('scenes/ensemble/characters.json',root),'utf8'));
const renderer=await readFile(new URL('scenes/ensemble/renderer.js',root),'utf8');
const html=template.replace('/*__DATA__*/',`const ENSEMBLE=${JSON.stringify(data)};`).replace('/*__RENDERER__*/',()=>renderer);
const output=new URL('preview/ensemble.html',root);
if(process.argv.includes('--check')){if(await readFile(output,'utf8')!==html)throw Error('Stale ensemble preview');}
else await writeFile(output,html);
