import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const count=JSON.parse(fs.readFileSync(new URL('../../public/stories/animated/catalog.json',import.meta.url))).filter(e=>e.category==='super-supportive').length;
const browser=await chromium.launch();
const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.clock.install();
await page.goto((process.env.READER_URL||'http://127.0.0.1:5190/pebble-reader.html'));
assert.equal(await page.locator('#episode option').count(),count);
for(const id of ['supportive-11','supportive-12','supportive-13']){
 await page.selectOption('#episode',id);
 // Walk the complete first-choice route, shortening only animation wall time.
 let steps=0,choices=0,animations=0;
 while(await page.locator('#next').textContent()!=='Episode complete'){
  assert.ok(++steps<1200,'Route must terminate');
  if(await page.locator('.choices button').count()){choices++;await page.locator('.choices button').first().click();}
  else{
   if(await page.locator('canvas').count()){animations++;await page.clock.runFor(12500);}
   // Closure state is private: virtual clock advances actual requestAnimationFrame.
   if(await page.locator('#next').isDisabled())await page.clock.runFor(12500);
   await page.clock.runFor(300);
   await page.locator('#next').click();
  }
 }
 assert.ok(choices>0);assert.ok(animations>=5);
 console.log(id,steps,'steps',choices,'choices',animations,'visual moments');
 await page.reload();assert.equal(await page.locator('#next').textContent(),'Episode complete');
 await page.locator('#back').click();assert.notEqual(await page.locator('#next').textContent(),'Episode complete');
}
assert.deepEqual(errors,[]);
await page.screenshot({path:'../output/pebble-phone-reader.png',fullPage:true});
await browser.close();
