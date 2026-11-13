import {chromium} from '@playwright/test';import fs from 'node:fs';import assert from 'node:assert/strict';import {reviewPage} from '../scripts/review-page.mjs';import {encodeScene} from '../scripts/downloadable-scene.mjs';
const root=new URL('../',import.meta.url),library=JSON.parse(fs.readFileSync(new URL('scenes/library.json',root))),ensemble=JSON.parse(fs.readFileSync(new URL('scenes/ensemble/characters.json',root)));ensemble.ambient=library.ambient;
const direction={cover:'Gorgon-neutral-full',reactions:[{anchor:'watch-look',actor:'Gorgon',emotion:'neutral'}]};
const recipe={actor:'boe',setting:'home',ambient:'foliage',prop:'none',keys:[[0,0,0,0,0],[1100,3,0,0,80],[2100,3,0,0,80],[3400,0,0,0,0]]};
const browser=await chromium.launch({headless:true});try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.clock.install();
 await page.setContent(reviewPage({direction,id:'test-999',title:'Downloaded motion',library,ensemble,supported:[],shots:[{anchor:'watch-new',scene:'download-pause',recipe}],messages:[]}));
 const canvas=page.locator('#watch'),pixels=()=>canvas.evaluate(c=>c.toDataURL());
 assert.equal(await canvas.getAttribute('data-scene'),'download-pause');const start=await pixels();await page.clock.runFor(1200);assert.notEqual(await pixels(),start);await page.clock.runFor(3000);assert.equal(await canvas.getAttribute('data-phase'),'hold');const held=await pixels();await page.clock.runFor(2000);assert.equal(await pixels(),held);
 await page.locator('#ambience').check();await page.clock.runFor(2000);assert.notEqual(await pixels(),held);
 const pending=page.waitForEvent('download');await page.locator('#download').click();const download=await pending;const plan=JSON.parse(fs.readFileSync(await download.path()));assert.deepEqual(plan.cues[0].recipe,recipe);assert.deepEqual(plan.reactions,direction.reactions);assert.equal(plan.cover,direction.cover);assert.equal(encodeScene(plan.cues[0].recipe),encodeScene(recipe));
 await page.locator('#replay').click();await page.clock.runFor(1200);await page.locator('#pause').click();const paused=await pixels();await page.clock.runFor(1000);assert.equal(await pixels(),paused);assert.deepEqual(errors,[]);
 fs.mkdirSync(new URL('.local/downloadable-scenes',root),{recursive:true});await page.screenshot({path:new URL('.local/downloadable-scenes/browser.png',root).pathname});console.log('PASS downloadable recipe preview, movement/hold/ambience, replay/pause and lossless cue export');
}finally{await browser.close();}
