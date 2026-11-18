import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {phoneEpisode} from './phone-episodes.mjs';
const root=new URL('../../public/stories/animated/',import.meta.url);
const catalog=JSON.parse(fs.readFileSync(new URL('catalog.json',root))).filter(e=>e.category==='super-supportive');
for(const entry of catalog)test(entry.id+' preserves language and every branch',()=>{
 const source=JSON.parse(fs.readFileSync(new URL(entry.path,root))),pack=phoneEpisode(source,entry),visited=new Set();let routes=0;
 function walk(index,ancestors=new Set()){
  assert.ok(index>=0&&index<pack.nodes.length);assert.ok(!ancestors.has(index),'No looping routes');const next=new Set(ancestors);next.add(index);visited.add(index);
  const n=pack.nodes[index];if(n.type==='end'){routes++;return;}
  if(n.type==='choice'){assert.ok(n.options.length>=2);for(const o of n.options)walk(o.to,next);}
  else walk(n.type==='goto'?n.to:index+1,next);
 }
 walk(pack.entry);assert.ok(routes>=2);
 const lines=source.script.split('\n').map(l=>l.trim()).filter(l=>/^\w+(?: \[[^\]]+\])?: .+$/.test(l));
 assert.equal(pack.nodes.filter(n=>n.type==='line').length,lines.length);
 assert.equal(pack.nodes.filter(n=>n.type==='choice').length,source.script.split('\n').filter(l=>l.startsWith('choice ')).length);
 assert.equal(phoneEpisode(source,entry).version,pack.version);
 for(const n of pack.nodes)for(const p of n.phrases||[])assert.ok(p.py&&p.en);
});
