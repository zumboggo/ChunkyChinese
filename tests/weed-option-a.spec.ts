import {test,expect} from '@playwright/test'

test('approved Option A keeps expressive SVG acting in the cast and early/late episodes',async({page},info)=>{
 await page.emulateMedia({reducedMotion:'reduce'})
 const errors:string[]=[]
 page.on('pageerror',error=>errors.push(error.message))
 await page.goto('/')
 await page.getByRole('button',{name:'Game',exact:true}).click()
 await page.getByRole('button',{name:'Meet the LMS cast',exact:true}).click()
 const cast=page.locator('.lms-cast-grid'),weed=cast.locator('[data-weed-design="option-a"]')
 await expect(weed).toHaveCount(1)
 await expect(weed).toHaveAttribute('data-age','teen')
 await expect(cast.locator('article').filter({hasText:'His sister'}).locator('[data-refined-face="spirited"]')).toHaveCount(1)
 for(const emotion of ['neutral','happy','worried','sad','angry','surprised','curious','confused','skeptical','embarrassed','relieved','determined','shocked','laughing','excited','scared','frustrated','proud','pleading','disappointed']){
  await page.getByLabel('Expression',{exact:true}).selectOption(emotion)
  await expect(weed).toHaveAccessibleName(new RegExp(emotion))
  expect(await weed.innerHTML()).not.toMatch(/NaN|Infinity|<image/)
  if(emotion==='happy')await expect(weed.locator('[data-expression="family-warmth"] [data-smile="broad"]')).toHaveCount(1)
  if(emotion==='excited')await expect(weed.locator('[data-expression="reward"]')).toHaveCount(1)
 }
 await page.getByLabel('Expression',{exact:true}).selectOption('neutral')
 await weed.screenshot({path:`.local/weed-options/portrait-${info.project.name}.png`})
 await page.getByLabel('Full figure',{exact:true}).check()
 await weed.screenshot({path:`.local/weed-options/full-${info.project.name}.png`})
 await page.getByLabel('Animate gestures',{exact:true}).check()
 await page.getByLabel('Expression',{exact:true}).selectOption('angry')
 await expect(weed.locator('[data-hand="fist"]')).toHaveCount(2)
 await page.getByRole('button',{name:'Meet the LMS cast',exact:true}).click()
 for(const episode of [1,26]){
  await page.locator('.episode-strip button').filter({hasText:new RegExp('^'+String(episode).padStart(2,'0'))}).click()
  await page.getByRole('button',{name:'Restart episode',exact:true}).click()
  await page.getByRole('button',{name:'Skip intro →',exact:true}).click()
  await expect(page.locator('.story-stage [data-weed-design="option-a"]')).toHaveCount(1)
  await page.locator('.story-stage').screenshot({path:`.local/weed-options/episode-${episode}-${info.project.name}.png`})
  await page.getByRole('button',{name:'Continue →',exact:true}).click()
  await page.getByRole('button',{name:'← Story library',exact:true}).click()
 }
 expect(errors).toEqual([])
})
