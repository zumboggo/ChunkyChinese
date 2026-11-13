import fs from 'node:fs';import crypto from 'node:crypto';
const root=new URL('../',import.meta.url),version=JSON.parse(fs.readFileSync(new URL('reader/package.json',root))).version;
if(!/^\d+\.\d+\.\d+$/.test(version))throw Error('Invalid release version');
const data=fs.readFileSync(new URL('reader/build/reader.pbw',root)),digest=b=>crypto.createHash('sha256').update(b).digest('hex');
const target=new URL(`release/chunky-chinese-time2-v${version}.pbw`,root);
if(fs.existsSync(target)&&digest(fs.readFileSync(target))!==digest(data))throw Error('Released version already exists with different bytes. Bump package.json version; never overwrite a shipped release.');
fs.mkdirSync(new URL('release/',root),{recursive:true});fs.writeFileSync(target,data);fs.writeFileSync(new URL('release/chunky-chinese-time2.pbw',root),data);
const files=fs.readdirSync(new URL('release/',root)).filter(f=>f.endsWith('.pbw')).sort();fs.writeFileSync(new URL('release/SHA256SUMS',root),files.map(f=>digest(fs.readFileSync(new URL('release/'+f,root)))+'  release/'+f).join('\n')+'\n');
console.log('Packaged '+target.pathname);
