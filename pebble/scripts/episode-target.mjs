import fs from 'node:fs';
export function episodeId(value){
 if(typeof value!=='string'||!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*-\d+(?:-v\d+)?$/.test(value))throw Error('Invalid episode ID: '+value+' (expected a slug ending in an episode number)');
 return value;
}
export function selectedPack(root,requested){
 const pack=JSON.parse(fs.readFileSync(new URL('reader/src/pkjs/bundled.json',root)));
 episodeId(pack.id);
 if(requested&&episodeId(requested)!==pack.id)throw Error('Selected episode '+requested+' does not match generated bundle '+pack.id+'; export/build the requested episode first');
 const content=JSON.parse(fs.readFileSync(new URL('content/'+pack.id+'.json',root)));
 if(JSON.stringify(content)!==JSON.stringify(pack))throw Error('Export and bundled episode differ');
 return pack;
}
