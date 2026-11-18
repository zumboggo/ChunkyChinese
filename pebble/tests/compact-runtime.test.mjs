import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const root=new URL('../reader/src/embeddedjs/',import.meta.url);
test('generated native bundle uses only platform imports and preserves public persistence/message keys',()=>{
 const code=fs.readFileSync(new URL('compiled/main.js',root),'utf8'),manifest=JSON.parse(fs.readFileSync(new URL('manifest.json',root)));
 assert.deepEqual(manifest.modules,{main:'./compiled/main'});assert.ok(!/from["']\./.test(code));
 for(const token of ['CATALOG','CREDIT_ACK','activeEpisode','completedAt','saved-'])assert.ok(code.includes(token),token);
 new vm.Script(code.replace(/import [^;]+;/g,''));
});
