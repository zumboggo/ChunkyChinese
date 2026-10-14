import {test,expect} from '@playwright/test'
test('reusable cast expresses all emotions and keeps articulated hands and props',async({page},info)=>{
 await page.goto('/');await page.getByRole('button',{name:'Game',exact:true}).click();await page.getByRole('button',{name:'Meet the LMS cast',exact:true}).click()
 const gallery=page.locator('.lms-cast-grid');await expect(gallery.locator('svg.cartoon-actor')).toHaveCount(5)
 await expect(gallery.locator('[data-age="elder"]')).toHaveCount(1)
 for(const emotion of ['neutral','happy','worried','sad','angry','surprised','curious','confused','skeptical','embarrassed','relieved','determined','shocked','laughing','excited','scared','frustrated','proud','pleading','disappointed']){
  await page.getByLabel('Expression',{exact:true}).selectOption(emotion);await expect(gallery.locator('svg.cartoon-actor')).toHaveCount(5);expect(await gallery.innerHTML()).not.toMatch(/NaN|Infinity/)
  if(['neutral','worried','shocked','laughing'].includes(emotion))await gallery.screenshot({path:'.local/cast/'+emotion+'-'+info.project.name+'.png'})
 }
 await page.getByLabel('Full figure',{exact:true}).check();await page.getByLabel('Animate gestures',{exact:true}).check();await page.getByLabel('Expression',{exact:true}).selectOption('angry');await expect(gallery.locator('[data-hand="fist"]')).toHaveCount(10)
 await page.getByLabel('Animate gestures',{exact:true}).uncheck();await page.getByLabel('Expression',{exact:true}).selectOption('neutral');await gallery.screenshot({path:'.local/cast/full-'+info.project.name+'.png'})
 await page.getByRole('button',{name:'02 An Impossible Number',exact:true}).click();await page.getByRole('button',{name:'Restart episode',exact:true}).click();await page.getByLabel('Reduced motion',{exact:true}).check()
 for(let i=0;i<40&&!await page.locator('[data-prop="phone"]').count();i++){
  if(await page.locator('.episode-choice').count())await page.locator('.episode-choice').first().click();else await page.getByRole('button',{name:'Continue →',exact:true}).click()
 }
 await expect(page.locator('[data-prop="phone"]')).toHaveCount(1);await expect(page.locator('[data-face="scrappy"]')).toHaveCount(1);await page.locator('.story-stage').screenshot({path:'.local/cast/phone-'+info.project.name+'.png'})
})

test('option B cast keeps expressive SVG faces and new episodes use Hyun',async({page},info)=>{
 await page.goto('/');await page.getByRole('button',{name:'Game',exact:true}).click()
 await page.getByRole('button',{name:'Meet the LMS cast'}).click()
 const cast=page.locator('.lms-cast-grid')
 await expect(cast.locator('article')).toHaveCount(5)
 await expect(cast.locator('[data-ponytail]')).toHaveCount(1)
 for(const emotion of ['determined','happy','relieved','excited','worried','angry','shocked','laughing']){
  await page.getByLabel('Expression',{exact:true}).selectOption(emotion)
  await expect(cast.locator('[data-refined-face]')).toHaveCount(2)
  await expect(cast.locator('image')).toHaveCount(0)
  if(emotion==='happy'){
   await expect(cast.locator('[data-expression="family-warmth"] [data-smile="broad"]')).toHaveCount(2)
   await cast.screenshot({path:`.local/cast/option-b-${info.project.name.replace(/ /g,'-')}.png`})
  }
 }
 await page.getByLabel('Full figure',{exact:true}).check()
 await page.getByLabel('Animate gestures',{exact:true}).check()
 await page.getByLabel('Expression',{exact:true}).selectOption('excited')
 await expect(cast.locator('[data-refined-face="scrappy"]')).toBeVisible()
 await page.getByLabel('Animate gestures',{exact:true}).uncheck()
 await expect(cast.locator('.puppet-still')).toHaveCount(5)
 await page.getByRole('button',{name:'Meet the LMS cast'}).click()
 await page.getByRole('button',{name:'Play / resume episode',exact:true}).click()
 await expect(page.locator('.story-stage [data-refined-face="scrappy"]')).toHaveCount(1)
})
