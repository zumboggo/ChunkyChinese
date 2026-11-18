import {chromium} from '@playwright/test';
import {readFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1000,height:750}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.clock.install();
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{get:()=>true});window.openai={setWidgetState:async s=>window.dispatchEvent(new CustomEvent('openai:set_globals',{detail:{globals:{widgetState:s}}}))};});
 await page.setContent(await readFile(new URL('ensemble.html',import.meta.url),'utf8'));
 const pixels=()=>page.locator('canvas').first().evaluate(c=>c.toDataURL());
 const initial=await pixels();await page.clock.runFor(2000);assert.notEqual(await pixels(),initial);
 await mkdir(new URL('verification/',import.meta.url),{recursive:true});
 await page.screenshot({path:new URL('verification/ensemble-listen.png',import.meta.url).pathname});
 await page.locator('[data-action]').selectOption('offer');await page.clock.runFor(3000);
 await page.screenshot({path:new URL('verification/ensemble-offer.png',import.meta.url).pathname});
 await page.clock.runFor(2000);assert.equal(await page.locator('#pebble-ensemble').getAttribute('data-phase'),'hold');
 await page.locator('[data-ambience]').uncheck();const held=await pixels();await page.clock.runFor(2000);assert.equal(await pixels(),held);
 await page.getByRole('button',{name:'Replay gesture'}).click();await page.clock.runFor(2000);assert.notEqual(await pixels(),held);
 await page.getByRole('button',{name:'Pause all'}).click();const paused=await pixels();await page.clock.runFor(2000);assert.equal(await pixels(),paused);
 await page.getByRole('button',{name:'Play',exact:true}).click();
 for(const action of ['listen','offer','think','sip'])for(const setting of ['consulate','train','meal','home','classroom','trading']){
  await page.locator('[data-action]').selectOption(action);await page.locator('[data-setting]').selectOption(setting);await page.clock.runFor(1200);
 }
 // Loop must reproduce exactly, and the train's last frame must be an ordinary step.
 const seam=await page.evaluate(()=>{
  const c=document.createElement('canvas');c.width=200;c.height=228;const ctx=c.getContext('2d');
  const frame=t=>{PebbleEnsemble.render(ctx,ENSEMBLE,{actor:'boe',action:'listen',setting:'train',actionMs:4800,ambientMs:t});return new Uint8Array(ctx.getImageData(0,0,200,228).data);};
  const diff=(a,b)=>a.reduce((s,v,i)=>s+(v!==b[i]),0);
  return {exact:diff(frame(0),frame(12000)),edge:diff(frame(12000-1000/12),frame(12000)),step:diff(frame(0),frame(1000/12))};
 });assert.equal(seam.exact,0);assert.ok(seam.edge<seam.step*1.5,'No jump at train wrap');
 await page.locator('[data-setting]').selectOption('train');await page.locator('[data-ambience]').check();await page.locator('[data-action]').selectOption('think');await page.clock.runFor(2000);
 await page.screenshot({path:new URL('verification/ensemble-train.png',import.meta.url).pathname});
 await page.setViewportSize({width:320,height:1000});await page.locator('[data-size]').check();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=320));
 assert.deepEqual(errors,[]);
 console.log('PASS: 24 action/settings combinations × 3 actors, motion, hold, replay, pause, hidden host, echoed state, 320px layout, exact train loop and seam continuity.',seam);
}finally{await browser.close();}
