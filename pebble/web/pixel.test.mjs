import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch();const context=await browser.newContext({viewport:{width:390,height:844}});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(process.env.READER_URL||'http://127.0.0.1:5192/pebble-reader.html');await page.selectOption('#episode',process.env.PIXEL_EPISODE_ID||'supportive-17');
for(let i=0;i<20&&!await page.locator('#screen canvas').count();i++)await page.locator('#next').click();
assert.equal(await page.locator('#screen canvas').count(),1);
await page.waitForFunction(()=>!document.getElementById('next').disabled);
const frame=await page.locator('canvas').evaluate(c=>c.toDataURL());await page.waitForTimeout(600);assert.equal(await page.locator('canvas').evaluate(c=>c.toDataURL()),frame);
await page.locator('#save').click();await page.getByRole('status').filter({hasText:/All \d+ episodes saved/}).waitFor();
await context.setOffline(true);await page.reload();assert.equal(await page.locator('#screen canvas').count(),1);
await page.waitForFunction(()=>!document.getElementById('next').disabled);await page.locator('#next').click();assert.ok(await page.locator('.pinyin').textContent());
await page.locator('#back').click();assert.equal(await page.locator('#screen canvas').count(),1);
if(process.env.FULL_PIXEL_ROUTE==='1'){
 let steps=0,choices=0;
 while(await page.locator('#next').textContent()!=='Episode complete'){
  assert.ok(++steps<1000,'Pixel route must finish');
  const options=page.locator('.choices button');
  if(await options.count()){choices++;await options.last().click();}
  else{await page.waitForFunction(()=>!document.getElementById('next').disabled);await page.locator('#next').click();}
 }
 assert.equal(choices,4);console.log('Full offline pixel route completed with all four choices');
}
assert.deepEqual(errors,[]);console.log('Pocket pixel hold, offline restore, Next and Back passed');await browser.close();
