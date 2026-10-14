import {test,expect} from '@playwright/test'
for(const route of ['family','money'])test(`Moonlight 04 ${route}: revised cast, choices, audio and resume`,async({page},info)=>{
 await page.goto('/');await page.getByRole('button',{name:'Game',exact:true}).click()
 await expect(page.locator('.episode-strip button')).toHaveCount(4)
 await page.getByRole('button',{name:'04 Once More',exact:true}).click()
 await page.getByRole('button',{name:'Play / resume episode',exact:true}).click()
 await page.getByLabel('Reduced motion',{exact:true}).check()
 await expect(page.locator('[data-face="lean"]')).toHaveCount(1)
 let choices=0,callback=false,heard=false,resumed=false
 for(let i=0;i<50;i++){
  if(await page.getByRole('heading',{name:'Scene complete',exact:true}).isVisible())break
  if(await page.locator('.episode-choice').count()){
   const options=route==='family'?['为了奶奶和妹妹，再来一次。','我们已经有家了，别动这些钱。']:['为了钱，再来一次。','如果不要那个房子呢？']
   const option=page.getByRole('button',{name:options[choices],exact:true})
   await expect(option.locator('.reader-interlinear-chunk').first()).toBeVisible()
   expect(await option.evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true)
   await option.click();choices++
  }else{
   const text=(await page.locator('.episode-line strong').allTextContents()).join('')
   if(text==='对啊。一次可以，两次也可以！'){
    await page.getByRole('button',{name:'Play audio',exact:true}).click();await expect(page.locator('svg.puppet-speaking')).toHaveCount(1);heard=true
    await page.screenshot({path:'.local/moonlight-04-'+route+'-'+info.project.name.replaceAll(' ','-')+'.png',fullPage:true})
   }
   if(text.includes('这就是现在可以用的钱')&&!resumed){
    await page.getByRole('button',{name:'← Story library',exact:true}).click();await page.getByRole('button',{name:'04 Once More',exact:true}).click();await page.getByRole('button',{name:'Play / resume episode',exact:true}).click()
    await expect.poll(async()=>(await page.locator('.episode-line strong').allTextContents()).join('')).toContain('这就是现在可以用的钱');resumed=true
   }
   if(text.includes(route==='family'?'我想让她们过好日子':'又没有让我变成一个笨蛋'))callback=true
   await page.getByRole('button',{name:'Continue →',exact:true}).click()
  }
 }
 expect({choices,callback,heard,resumed}).toEqual({choices:2,callback:true,heard:true,resumed:true})
 await expect(page.getByRole('heading',{name:'Scene complete',exact:true})).toBeVisible()
 await expect(page.getByRole('button',{name:'Next Episode →',exact:true})).toHaveCount(0)
})
test('one failed download leaves other episodes visible and retry restores it',async({page})=>{
 let fail=true;await page.route('**/stories/animated/moonlight-02-v3.json',route=>fail?route.abort():route.continue())
 await page.goto('/');await page.getByRole('button',{name:'Game',exact:true}).click()
 await expect(page.getByRole('button',{name:'01 Before the First Bid',exact:true})).toBeVisible()
 await expect(page.getByRole('button',{name:'03 The Price of Safety',exact:true})).toBeVisible()
 await expect(page.getByRole('button',{name:'04 Once More',exact:true})).toBeVisible()
 await expect(page.getByRole('alert')).toContainText('LMS episode 2')
 // Draft autosave must not overwrite the library failure.
 await expect(page.getByRole('status').first()).toContainText('Draft saved')
 await expect(page.getByRole('button',{name:'Retry episode downloads'})).toBeVisible()
 fail=false;await page.getByRole('button',{name:'Retry episode downloads'}).click()
 await expect(page.locator('.episode-strip button')).toHaveCount(4)
 await expect(page.getByRole('alert')).toHaveCount(0)
 await page.context().setOffline(true)
 await page.getByRole('button',{name:'04 Once More',exact:true}).click();await page.getByRole('button',{name:'Play / resume episode',exact:true}).click()
 await expect(page.locator('[data-face="lean"]')).toHaveCount(1)
})
