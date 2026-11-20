import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const entries=JSON.parse(fs.readFileSync(new URL('../../public/stories/animated/catalog.json',import.meta.url))).filter(e=>e.category==='super-supportive').sort((a,b)=>a.episode-b.episode);
const latest=entries.at(-1).episode;
const browser=await chromium.launch();const context=await browser.newContext({viewport:{width:390,height:844}});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(process.env.READER_URL||'http://127.0.0.1:5190/pebble-reader.html');
assert.deepEqual(await page.locator('#episode option').evaluateAll(rows=>rows.map(r=>r.value)),entries.map(e=>'supportive-'+e.episode));
for(const {episode:i} of entries){
 await page.selectOption('#episode','supportive-'+i);
 const directionPath=new URL(`../../src/game/animation/pixel/supportive-${i}.json`,import.meta.url);
 const direction=fs.existsSync(directionPath)?JSON.parse(fs.readFileSync(directionPath)):null;
 if([11,12,13].includes(i)||direction?.shots.some(s=>!s.comic))continue; // Pixel performances have their own full-playback suite; include comic routes here.
 await page.locator('#next').click();
 const at=await page.locator('#position').textContent();await page.reload();assert.equal(await page.locator('#position').textContent(),at);
 const result=await page.evaluate(()=>{let steps=0,choices=0;while(document.getElementById('next').textContent!=='Episode complete'){
  if(++steps>1500)throw Error('Route did not end');
  const options=document.querySelectorAll('.choices button');if(options.length){choices++;options[options.length-1].click();}else document.getElementById('next').click();
 }return {steps,choices};});assert.ok(result.choices>0);
 await page.reload();assert.equal(await page.locator('#next').textContent(),'Episode complete');
 await page.locator('#back').click();assert.notEqual(await page.locator('#next').textContent(),'Episode complete');
 console.log(i,result);
}
assert.deepEqual(errors,[]);await browser.close();
