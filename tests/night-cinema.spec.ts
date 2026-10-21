import {test,expect} from '@playwright/test'

test('cinema keeps interlinear chunks readable with independent aids and large text',async({page},info)=>{
 await page.goto('/')
 await page.getByRole('button',{name:'Game',exact:true}).click()
 await page.getByRole('button',{name:'01 Before the First Bid',exact:true}).click()
 await page.getByRole('button',{name:'Restart episode',exact:true}).click()
 const chunks=page.locator('.episode-line .reader-interlinear-chunk')
 await expect(chunks.first()).toBeVisible()
 for(const chunk of await chunks.all()){
  await expect(chunk.locator('strong')).toBeVisible()
  await expect(chunk.locator('.reader-interlinear-pinyin')).toBeVisible()
  await expect(chunk.locator('.reader-interlinear-gloss')).toBeVisible()
 }
 const chinese=await chunks.locator('strong').allTextContents()
 await page.getByRole('button',{name:'English',exact:true}).click()
 await expect(chunks.locator('.reader-interlinear-gloss')).toHaveCount(0)
 expect(await chunks.locator('strong').allTextContents()).toEqual(chinese)
 await expect(chunks.first().locator('.reader-interlinear-pinyin')).toBeVisible()
 await page.getByRole('button',{name:'English',exact:true}).click()
 await page.getByRole('button',{name:'Pinyin',exact:true}).click()
 await expect(chunks.locator('.reader-interlinear-pinyin')).toHaveCount(0)
 await expect(chunks.first().locator('.reader-interlinear-gloss')).toBeVisible()
 await page.getByRole('button',{name:'Pinyin',exact:true}).click()
 await expect(page.locator('.game-playing')).toHaveCSS('color','rgb(246, 237, 219)')
 await page.locator('.game-playing').evaluate(el=>{el.scrollTop=0})
 await page.screenshot({path:`../output/night-cinema-${info.project.name.replaceAll(' ','-')}.png`})
 await page.getByLabel('Game text size',{exact:true}).selectOption('6')
 expect(await page.locator('.game-playing').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true)
 for(const chunk of await chunks.all()){
  const parent=await page.locator('.story-dialogue').boundingBox(),box=await chunk.boundingBox()
  expect(box!.x+box!.width).toBeLessThanOrEqual(parent!.x+parent!.width)
 }
 await page.getByRole('button',{name:'Continue →',exact:true}).click()
 await expect(page.locator('.episode-line .reader-interlinear-chunk').first()).toBeVisible()
})
