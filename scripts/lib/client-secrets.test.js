import {test,expect} from 'vitest'
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {spawnSync} from 'node:child_process'
const scanner=path.resolve('scripts/check-client-secrets.mjs')
test('AWS scanner catches standalone keys but not substrings inside encoded assets',()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'client-secrets-'))
 try{
  mkdirSync(path.join(dir,'dist'))
  const key='AKIA'+'A'.repeat(16)
  const scan=value=>{writeFileSync(path.join(dir,'dist','fixture.json'),JSON.stringify({value}));return spawnSync(process.execPath,[scanner],{cwd:dir,encoding:'utf8'})}
  expect(scan(key).status).toBe(1)
  expect(scan('key='+key+'&other=x').status).toBe(1)
  expect(scan('data:audio/mp4;base64,abc'+key+'xyz').status).toBe(0)
 }finally{rmSync(dir,{recursive:true,force:true})}
})

test('Google scanner catches standalone and URL keys without mistaking embedded audio for a key',()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'client-secrets-google-'))
 try{
  mkdirSync(path.join(dir,'dist'))
  const key='AIza'+'A'.repeat(35)
  const scan=value=>{writeFileSync(path.join(dir,'dist','fixture.json'),JSON.stringify({value}));return spawnSync(process.execPath,[scanner],{cwd:dir,encoding:'utf8'})}
  expect(scan(key).status).toBe(1)
  expect(scan('https://example.com/?key='+key+'&other=x').status).toBe(1)
  expect(scan('data:audio/mp4;base64,abc'+key+'xyz').status).toBe(0)
  expect(scan('data:audio/mp4;base64,abc'+key+'xyz '+key).status).toBe(1)
 }finally{rmSync(dir,{recursive:true,force:true})}
})
