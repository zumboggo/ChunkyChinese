import {test,expect} from '@playwright/test'
for(const episode of ['01 Before the First Bid','02 An Impossible Number','03 The Price of Safety'])test(`${episode}: Grandma appears and speaks on screen`,async({page},info)=>{
 await page.goto('/');await page.getByRole('button',{name:'Game',exact:true}).click();await page.getByRole('button',{name:episode,exact:true}).click();await page.getByRole('button',{name:'Play / resume episode',exact:true}).click();await page.emulateMedia({reducedMotion:'reduce'})
 let seen=false
 for(let i=0;i<90;i++){
  if(await page.locator('.story-dialogue').innerText().then(s=>s.includes('奶奶 ·'))){
   await expect(page.locator('svg[data-age="elder"]')).toHaveCount(1)
   await expect(page.locator('.story-stage')).toHaveAttribute('data-shot','close')
   await page.getByRole('button',{name:'Play audio',exact:true}).click()
   await expect(page.locator('svg[data-age="elder"].puppet-speaking')).toHaveCount(1)
   await page.screenshot({path:'.local/grandma-'+episode.slice(0,2)+'-'+info.project.name.replaceAll(' ','-')+'.png',fullPage:true});seen=true;break
  }
  const choices=page.locator('.episode-choice');if(await choices.count())await choices.first().click();else await page.getByRole('button',{name:'Continue →',exact:true}).click()
 }
 expect(seen).toBe(true)
})
