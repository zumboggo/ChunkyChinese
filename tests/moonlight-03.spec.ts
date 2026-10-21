import {test,expect} from '@playwright/test'
for(const route of ['count','listen'] as const)test(`Moonlight 03 ${route}: paired staging, handoff, callback and resume`,async({page},testInfo)=>{
 await page.goto('/');await page.getByRole('button',{name:'Game',exact:true}).click();await page.getByRole('button',{name:'03 The Price of Safety',exact:true}).click()
 const card=page.locator('article').filter({has:page.getByRole('heading',{name:'The Price of Safety',exact:true})})
 await card.getByRole('button',{name:'Restart episode',exact:true}).click()
 await page.emulateMedia({reducedMotion:'reduce'})
 const options=route==='count'?['问清楚：为什么变成这么多？','想到妹妹，不能让她出事。','记住他们拿走的钱。']:['先听听他们怎么说。','看看奶奶，让她放心。','记住家人很怕的样子。']
 let choices=0,handoff=false,callback=false,heard=false
 for(let i=0;i<85;i++){
  if(await page.getByRole('heading',{name:'Scene complete',exact:true}).isVisible())break
  if(await page.getByRole('heading',{name:'What do I do?',exact:true}).isVisible()){
   const option=page.getByRole('button',{name:options[choices],exact:true})
   await expect(option.locator('.reader-interlinear-chunk').first()).toBeVisible();expect(await option.evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true)
   if(choices===0){await page.getByRole('button',{name:'Hear option: '+options[0],exact:true}).click();await expect(page.locator('svg.puppet-speaking')).toHaveCount(0);await page.keyboard.press(route==='count'?'1':'2')}
   else await option.click()
   choices++
  }else{
   const text=(await page.locator('.episode-line strong').allTextContents()).join('')
   if(text==='30亿？父亲只借了1亿！'){
    await expect(page.locator('.story-stage svg')).toHaveCount(2)
    await page.getByRole('button',{name:'Play audio',exact:true}).click();await expect(page.locator('svg.puppet-speaking')).toHaveCount(1);heard=true
    if(route==='count')await page.screenshot({path:'.local/moonlight-03-'+testInfo.project.name.replaceAll(' ','-')+'.png',fullPage:true})
   }
   if(route==='count' && text.includes('我看看手里的存折'))await page.emulateMedia({reducedMotion:'no-preference'})
   if(await page.getByText('I hand over the bankbook. The man takes it.',{exact:true}).isVisible()){
    handoff=true;await expect(page.locator('.story-stage svg')).toHaveCount(2)
    await expect(page.getByRole('button',{name:'Continue →',exact:true})).toBeEnabled()
    await page.emulateMedia({reducedMotion:'reduce'})
    await page.getByRole('button',{name:'← Story library',exact:true}).click();await page.getByRole('button',{name:'03 The Price of Safety',exact:true}).click();await card.getByRole('button',{name:'Play / resume episode',exact:true}).click()
    await expect(page.getByText('I hand over the bankbook. The man takes it.',{exact:true})).toBeVisible()
   }
   if(text.includes(route==='count'?'我刚才只希望妹妹不会出事':'我刚才让奶奶别怕'))callback=true
   await page.getByRole('button',{name:'Continue →',exact:true}).click()
  }
 }
 expect(choices).toBe(3);expect(handoff&&callback&&heard).toBe(true)
 await expect(page.getByRole('heading',{name:'Scene complete',exact:true})).toBeVisible()
 await page.getByRole('button',{name:'Recall the conversation',exact:true}).click()
 await expect(page.locator('.animated-story aside')).toContainText('我叫Han Jinsup。')
 await expect(page.locator('.animated-story aside')).toContainText('90,000,000韩元')
})
