import {chromium} from '@playwright/test';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url);
execFileSync(process.execPath,[fileURLToPath(new URL('scripts/episode-author.mjs',root)),'review','supportive-11']);
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1100,height:850}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.clock.install();
 await page.setContent(fs.readFileSync(new URL('.local/authoring/supportive-11/review.html',root),'utf8'));
 const watch=page.locator('#watch'),phase=()=>watch.getAttribute('data-phase'),pixels=()=>watch.evaluate(c=>c.toDataURL());
 assert.equal(await page.locator('.shot').count(),5);assert.equal(await phase(),'establish');await page.clock.runFor(3200);assert.equal(await phase(),'waiting');await page.clock.runFor(10000);assert.equal(await phase(),'waiting');
 await page.locator('#select').focus();await page.keyboard.down('Enter');assert.equal(await phase(),'playing');await page.clock.runFor(4300);assert.equal(await phase(),'hold');await page.keyboard.down('Enter');assert.equal(await phase(),'hold');await page.keyboard.up('Enter');const held=await pixels();await page.clock.runFor(2000);assert.equal(await pixels(),held);await page.keyboard.press('Enter');assert.equal(await watch.getAttribute('data-scene'),'restaurant-seat');
 await page.locator('#catalogue-tab').click();const library=JSON.parse(fs.readFileSync(new URL('scenes/library.json',root)));
 assert.equal(await page.locator('.card').count(),library.scenes.length);
 for(const scene of library.scenes){
  await page.locator('.card[data-scene="'+scene.id+'"]').click();const start=await pixels();
  if(scene.action){await page.clock.runFor(scene.establish+100);await page.locator('#select').click();}
  await page.clock.runFor(1800);if(!scene.sample)assert.notEqual(await pixels(),start,'No visible movement: '+scene.id);
  await page.clock.runFor(6000);assert.equal(await phase(),'hold');const end=await pixels();await page.clock.runFor(1000);assert.equal(await pixels(),end,'Held pose changes: '+scene.id);
 }
 await page.locator('#search').fill('Gorgon');assert.equal(await page.locator('.card').count(),4);await page.locator('.card').first().click();await page.locator('#use-recipe').click();assert.match(await page.locator('.shot.active').innerText(),/gorgon-listen/);
 await page.locator('#notes').fill('Pause before responding.');const download=page.waitForEvent('download');await page.locator('#download').click();const file=await download;const output=await file.path();const plan=JSON.parse(fs.readFileSync(output));assert.equal(plan.cues[1].scene,'gorgon-listen');assert.equal(plan.cues[1].note,'Pause before responding.');assert.equal(plan.cues[1].anchor,'watch_restaurant_seat');
 await page.locator('#replay').click();await page.clock.runFor(500);await page.locator('#pause').click();const paused=await pixels();await page.clock.runFor(3000);assert.equal(await pixels(),paused);
 await page.locator('#large').check();await page.setViewportSize({width:360,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=360));
 const out=new URL('.local/authoring/testing/',root);fs.mkdirSync(out,{recursive:true});await page.screenshot({path:fileURLToPath(new URL('review.png',out)),fullPage:true});
 await page.evaluate(()=>REVIEW.library.scenes.push({id:'unsupported-99',nativeId:99,name:'Unsupported',group:'Test',setting:'unknown',duration:4000,sample:true}));await page.locator('#catalogue-tab').click();await page.locator('#search').fill('unsupported');await page.locator('.card').click();assert.equal(await phase(),'unavailable');assert.match(await page.locator('#status').innerText(),/preview unavailable/);
 assert.deepEqual(errors,[]);console.log('PASS all recipe previews, episode order, wait/repeat/hold/replay, search, cue-plan download, pause and narrow layout');
}finally{await browser.close();}
