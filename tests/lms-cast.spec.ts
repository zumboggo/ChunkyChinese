import {test,expect} from '@playwright/test'
test('reusable cast expresses all emotions and keeps articulated hands and props',async({page},info)=>{
 await page.goto('/');await page.getByRole('button',{name:'Game',exact:true}).click();await page.getByRole('button',{name:'Meet the LMS cast',exact:true}).click()
 const gallery=page.locator('.lms-cast-grid');await expect(gallery.locator('svg.cartoon-actor')).toHaveCount(4)
 await expect(gallery.locator('[data-age="elder"]')).toHaveCount(1)
 for(const emotion of ['neutral','happy','worried','sad','angry','surprised','curious','confused','skeptical','embarrassed','relieved','determined','shocked','laughing','excited','scared','frustrated','proud','pleading','disappointed']){
  await page.getByLabel('Expression',{exact:true}).selectOption(emotion);await expect(gallery.locator('svg.cartoon-actor')).toHaveCount(4);expect(await gallery.innerHTML()).not.toMatch(/NaN|Infinity/)
  if(['neutral','worried','shocked','laughing'].includes(emotion))await gallery.screenshot({path:'.local/cast/'+emotion+'-'+info.project.name+'.png'})
 }
 await page.getByLabel('Full figure',{exact:true}).check();await page.getByLabel('Animate gestures',{exact:true}).check();await page.getByLabel('Expression',{exact:true}).selectOption('angry');await expect(gallery.locator('[data-hand="fist"]')).toHaveCount(8)
 await page.getByLabel('Animate gestures',{exact:true}).uncheck();await page.getByLabel('Expression',{exact:true}).selectOption('neutral');await gallery.screenshot({path:'.local/cast/full-'+info.project.name+'.png'})
 await page.getByRole('button',{name:'02 An Impossible Number',exact:true}).click();await page.getByRole('button',{name:'Restart episode',exact:true}).click();await page.getByLabel('Reduced motion',{exact:true}).check()
 for(let i=0;i<40&&!await page.locator('[data-prop="phone"]').count();i++){
  if(await page.locator('.episode-choice').count())await page.locator('.episode-choice').first().click();else await page.getByRole('button',{name:'Continue →',exact:true}).click()
 }
 await expect(page.locator('[data-prop="phone"]')).toHaveCount(1);await expect(page.locator('[data-face="lean"]')).toHaveCount(1);await page.locator('.story-stage').screenshot({path:'.local/cast/phone-'+info.project.name+'.png'})
})
