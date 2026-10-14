import {test,expect} from '@playwright/test'
test('categories, independent reading aids, persistent preferences and next episode',async({page},info)=>{
 await page.goto('/');await page.getByRole('button',{name:'Game',exact:true}).click()
 await expect(page.locator('.episode-strip button')).toHaveText(['01Before the First Bid','02An Impossible Number','03The Price of Safety','04Once More','05A Year Before the Game'])
 await page.getByRole('button',{name:/Daily Life Small moments/}).click()
 await expect(page.getByText('No Daily Life episodes yet.',{exact:false})).toBeVisible()
 await page.getByRole('button',{name:/LMS A new world/}).click()
 await page.screenshot({path:'.local/design/library-'+info.project.name+'.png',fullPage:true})
 await page.getByRole('button',{name:'Restart episode',exact:true}).click()
 await page.getByLabel('Reduced motion',{exact:true}).check()
 await page.screenshot({path:'.local/design/player-'+info.project.name+'.png',fullPage:true})
 const english=page.getByRole('button',{name:'English',exact:true}),pinyin=page.getByRole('button',{name:'Pinyin',exact:true})
 await expect(page.locator('.reader-interlinear-gloss').first()).toBeVisible()
 await english.click();await expect(page.locator('.reader-interlinear-gloss')).toHaveCount(0)
 await expect(page.locator('.reader-interlinear-pinyin').first()).toBeVisible()
 await pinyin.click();await expect(page.locator('.reader-interlinear-pinyin')).toHaveCount(0)
 await english.click();await expect(page.locator('.reader-interlinear-gloss').first()).toBeVisible()
 await page.getByRole('button',{name:'← Story library',exact:true}).click()
 await page.getByRole('button',{name:'Play / resume episode',exact:true}).click()
 await expect(pinyin).toHaveAttribute('aria-pressed','false');await expect(english).toHaveAttribute('aria-pressed','true')
 for(let i=0;i<100;i++){
  if(await page.getByRole('heading',{name:'Scene complete',exact:true}).count())break
  const choices=page.locator('.episode-choice');if(await choices.count())await choices.first().click();else await page.getByRole('button',{name:'Continue →',exact:true}).click()
 }
 await page.getByRole('button',{name:'Next Episode →',exact:true}).click()
 await expect(page.getByRole('heading',{name:'Moonlight Sculptor 02 · An Impossible Number',exact:true})).toBeVisible()
 await expect(pinyin).toHaveAttribute('aria-pressed','false')
 await expect(page.getByRole('button',{name:'Play audio',exact:true})).toBeVisible()
 await page.getByRole('button',{name:'← Story library',exact:true}).click()
 await page.getByRole('button',{name:'03 The Price of Safety',exact:true}).click()
 await page.getByRole('button',{name:'Restart episode',exact:true}).click()
 for(let i=0;i<100;i++){
  if(await page.getByRole('heading',{name:'Scene complete',exact:true}).count())break
  const choices=page.locator('.episode-choice');if(await choices.count())await choices.first().click();else await page.getByRole('button',{name:'Continue →',exact:true}).click()
 }
 await expect(page.getByRole('heading',{name:'Scene complete',exact:true})).toBeVisible()
 await page.getByRole('button',{name:'Next Episode →',exact:true}).click()
 await expect(page.getByRole('heading',{name:'Moonlight Sculptor 04 · Once More',exact:true})).toBeVisible()
})
