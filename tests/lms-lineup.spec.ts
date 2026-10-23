import {test,expect} from '@playwright/test'
test('approved lineup is available as articulated SVG with expressions and full figures',async({page},info)=>{
 await page.emulateMedia({reducedMotion:'reduce'})
 await page.goto('/')
 await page.getByRole('button',{name:'Game',exact:true}).click()
 await page.getByRole('button',{name:'Meet the LMS cast',exact:true}).click()
 const cards=page.locator('.lms-cast-grid article')
 await expect(cards).toHaveCount(21)
 for(const name of ['Irene','Seoyoon','Surka','Romuna','Mapan','Hwaryeong','Geomchi'])await expect(page.getByRole('heading',{name,exact:true})).toBeVisible()
 for(const emotion of ['neutral','worried','happy','angry','surprised']){
  await page.getByLabel('Expression',{exact:true}).selectOption(emotion)
  await expect(cards.first().locator('svg')).toHaveCount(1)
 }
 await cards.first().screenshot({path:'.local/design/lineup-weed-'+info.project.name+'.png'})
 await page.getByLabel('Full figure',{exact:true}).check()
 await page.locator('.lms-cast').screenshot({path:'.local/design/lineup-full-'+info.project.name+'.png'})
 await page.getByLabel('Animate gestures',{exact:true}).check()
 await expect(cards.first().locator('svg')).toBeVisible()
})
