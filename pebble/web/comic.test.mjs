import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const browser=await chromium.launch();
const context=await browser.newContext({viewport:{width:390,height:844}});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(process.env.READER_URL||'http://127.0.0.1:5194/pebble-reader.html');
await page.selectOption('#episode','supportive-18');
assert.equal(await page.locator('.comic-panel').count(),1);
await page.locator('#next').click();const position=await page.locator('#position').textContent();
await page.locator('#save').click();await page.getByRole('status').filter({hasText:/All \d+ episodes saved/}).waitFor();
await context.setOffline(true);await page.reload();
assert.equal(await page.locator('#position').textContent(),position);
assert.equal(await page.locator('.comic-panel').count(),1);
assert.ok(await page.locator('.comic-panel').evaluate(e=>getComputedStyle(e).backgroundImage.startsWith('url("data:image/jpeg;base64,')));
await page.locator('#back').click();assert.notEqual(await page.locator('#position').textContent(),position);
fs.mkdirSync('.local/comic-review',{recursive:true});
await page.screenshot({path:'.local/comic-review/pocket-offline.png',fullPage:true});
for(const option of [0,1]){
 if(option){page.once('dialog',d=>d.accept());await page.locator('#restart').click();}
 const result=await page.evaluate(option=>{let steps=0,choices=0;const panels=new Set();while(document.getElementById('next').textContent!=='Episode complete'){
  if(++steps>1000)throw Error('Comic route did not finish');
  const choicesHere=document.querySelectorAll('.choices button');
  if(choicesHere.length){choices++;choicesHere[option].click();}
  else{const art=document.querySelector('.comic-panel');if(!art)throw Error('Missing comic illustration');panels.add(art.getAttribute('aria-label'));document.getElementById('next').click();}
 }return {steps,choices,panels:panels.size}},option);
 assert.equal(result.choices,4);assert.ok(result.panels>=17);console.log('Offline comic route',option,result);
}
await page.selectOption('#episode','supportive-19');assert.ok(await page.locator('.pinyin').textContent());
assert.deepEqual(errors,[]);console.log('Pocket comic, both routes, choices, offline save/reload and bookmarks passed');
await browser.close();
