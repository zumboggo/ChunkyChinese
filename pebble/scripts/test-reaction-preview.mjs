import {chromium} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setContent(await readFile(new URL('../pixel-reactions/hannah-sincere/preview/index.html',import.meta.url),'utf8'));
 await page.waitForFunction(()=>document.querySelectorAll('article span').length===6&&[...document.querySelectorAll('article span')].every(x=>x.textContent==='Held'));
 const pixels=()=>page.locator('canvas').evaluateAll(cs=>cs.map(c=>c.toDataURL()));const held=await pixels();
 await page.getByRole('button',{name:'Replay all',exact:true}).click();await page.waitForFunction(()=>[...document.querySelectorAll('article span')].some(x=>x.textContent==='Playing'));
 await page.waitForFunction(()=>[...document.querySelectorAll('article span')].every(x=>x.textContent==='Held'));assert.deepEqual(await pixels(),held);
 await page.locator('article').nth(4).getByRole('button').click();await page.waitForFunction(()=>document.querySelectorAll('article span')[4].textContent==='Playing');
 assert.equal(await page.locator('article span').filter({hasText:'Held'}).count(),5);
 await page.waitForFunction(()=>[...document.querySelectorAll('article span')].every(x=>x.textContent==='Held'));assert.deepEqual(await pixels(),held);assert.deepEqual(errors,[]);
 console.log('PASS Hannah: all six finish and hold, Replay All, independent laugh replay, stable final images, no browser errors');
}finally{await browser.close();}
