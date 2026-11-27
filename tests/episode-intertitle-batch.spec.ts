import {test,expect} from '@playwright/test'
import {readFileSync} from 'node:fs'

test.use({reducedMotion:'reduce'})
for(const episode of [19,20,21,22,23,24,25,26,27,28])test(`episode ${episode} short pages, original reveal, saved resume and complete route`,async({page},info)=>{
 test.setTimeout(120000)
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message))
 const pack=JSON.parse(readFileSync(`public/stories/animated/supportive-${episode}.json`,'utf8'))
 const catalogue=JSON.parse(readFileSync('public/stories/animated/catalog.json','utf8'))
 const entry=catalogue.find((e:{id:string})=>e.id===`supportive-${episode}-v1`)
 await page.goto(process.env.PLAYWRIGHT_BASE_URL||'/')
 await page.getByRole('button',{name:'Game',exact:true}).click()
 await page.getByRole('button',{name:'Choose story: Super Supportive',exact:true}).click()
 await page.getByLabel('Episode',{exact:true}).selectOption(entry.id)
 await page.getByRole('button',{name:'Play / resume episode',exact:true}).click()
 if(pack.notice)await page.getByRole('button',{name:'Accept',exact:true}).click()
 if(entry.intro)await page.getByRole('button',{name:'Skip intro →',exact:true}).click()
 const text=page.locator('.episode-line'),chunks=text.locator('.reader-interlinear-chunk'),reveals=page.locator('.comic-panel,.pixel-scene'),next=page.getByRole('button',{name:'Continue →',exact:true})
 async function checkText(){
  const count=await chunks.count();expect(count).toBeGreaterThan(0);expect(count).toBeLessThanOrEqual(3)
  await expect(text.locator('.reader-interlinear-pinyin')).toHaveCount(count)
  await expect(text.locator('.reader-interlinear-gloss')).toHaveCount(count)
  await expect(reveals).toHaveCount(0)
 }
 await checkText()
 const bar=page.getByRole('progressbar',{name:'Episode progress'})
 await expect(bar).toHaveAttribute('aria-valuenow','0')
 expect(await page.locator('.story-dialogue').evaluate(e=>getComputedStyle(e).backgroundColor)).toBe('rgb(255, 255, 255)')
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await page.screenshot({path:info.outputPath('text.png'),fullPage:true})
 while(await reveals.count()===0){await checkText();await next.click()}
 if(episode===19)await expect(page.locator('.pixel-scene')).toHaveAttribute('data-pixel-phase','held')
 else await expect(page.locator('.comic-panel')).toHaveAttribute('data-comic-panel',`supportive-${episode}-1:0`)
 await expect(text).not.toBeVisible()
 await page.screenshot({path:info.outputPath('reveal.png'),fullPage:true})
 // Wait for the actual persisted bookmark before reloading the installed-app path.
 await expect.poll(()=>page.evaluate(()=>new Promise<boolean>(resolve=>{const r=indexedDB.open('ChunkyChineseStory2',1);r.onsuccess=()=>{const db=r.result,q=db.transaction('records').objectStore('records').getAll();q.onsuccess=()=>{resolve(q.result.some(v=>v?.reading?.image||v?.reading?.phase==='pixel'));db.close()}}}))).toBe(true)
 const savedPercent=await bar.getAttribute('aria-valuenow')
 await page.reload();await page.getByRole('button',{name:'Game',exact:true}).click();await page.getByRole('button',{name:'Play / resume episode',exact:true}).click()
 await expect(reveals).toBeVisible();await expect(text).not.toBeVisible()
 await expect(bar).toHaveAttribute('aria-valuenow',savedPercent!)
 await page.keyboard.press('ArrowLeft');await checkText()
 await next.click();await expect(reveals).toBeVisible()
 for(let step=0;step<260;step++){
  if(await page.getByRole('heading',{name:'Scene complete',exact:true}).count())break
  const choices=page.locator('.episode-choice')
  if(await choices.count())await choices.nth(info.project.name==='chromium'?0:1).click()
  else if(await page.locator('.pixel-scene').count())await page.getByRole('button',{name:'Next →',exact:true}).click()
  else {if(await text.isVisible())await checkText();await next.click()}
 }
 await expect(page.getByRole('heading',{name:'Scene complete',exact:true})).toBeVisible()
 await expect(bar).toHaveAttribute('aria-valuenow','100')
 expect(errors).toEqual([])
})
