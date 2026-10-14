import {test,expect} from '@playwright/test'
for(const route of ['medicine','clothes'] as const)test(`Moonlight 02 ${route}: audio, chunks, callbacks and resume`,async({page},testInfo)=>{
 await page.goto('/');await page.getByRole('button',{name:'Game',exact:true}).click();await page.getByRole('button',{name:'02 An Impossible Number',exact:true}).click()
 const card=page.locator('article').filter({has:page.getByRole('heading',{name:'An Impossible Number',exact:true})})
 await card.getByRole('button',{name:'Restart episode',exact:true}).click()
 await page.getByLabel('Reduced motion',{exact:true}).check()
 const selections=route==='medicine'?['想想看医生的钱。','心里想想：也许是游戏里的钱？','说说以后的家。']:['想想工作穿的衣服。','心里想想：也许她找错人了？','说说回学校的事。']
 let choices=0,heard=false,number=false,remembered=false
 for(let i=0;i<75;i++){
  if(await page.getByRole('heading',{name:'Scene complete',exact:true}).isVisible())break
  if(await page.getByRole('heading',{name:'What do I do?',exact:true}).isVisible()){
   const choice=page.getByRole('button',{name:selections[choices],exact:true})
   await expect(choice.locator('.reader-interlinear-chunk').first()).toBeVisible()
   expect(await choice.evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true)
   if(choices===0){
    await page.getByRole('button',{name:'Hear option: '+selections[choices],exact:true}).click()
    await expect(page.locator('svg.puppet-speaking')).toHaveCount(0)
    await page.keyboard.press(route==='medicine'?'1':'2')
   }else await choice.click()
   choices++
   if(choices===2){
    const text=await page.locator('.episode-line strong').allTextContents()
    await page.getByRole('button',{name:'← Story library',exact:true}).click();await page.getByRole('button',{name:'02 An Impossible Number',exact:true}).click()
    await card.getByRole('button',{name:'Play / resume episode',exact:true}).click()
    await expect(page.locator('.episode-line strong')).toHaveText(text)
   }
  }else{
   const text=(await page.locator('.episode-line strong').allTextContents()).join('')
   if(text.includes('30亿9千万韩元')){
    number=true
    await expect(page.locator('.episode-line')).toContainText('3.09 billion won')
    await expect(page.locator('.episode-line')).toContainText('sān shí yì jiǔ qiān wàn hán yuán')
   }
   if(text==='多少？！你再说一次！'){
    await page.getByRole('button',{name:'Play audio',exact:true}).click()
    await expect(page.locator('svg.puppet-speaking')).toHaveCount(1);heard=true
   }
   if(text.includes(route==='medicine'?'我本来只希望有钱看医生':'我本来只打算买点衣服'))remembered=true
   await page.getByRole('button',{name:'Continue →',exact:true}).click()
  }
 }
 expect(choices).toBe(3);expect(number&&heard&&remembered).toBe(true)
 await expect(page.getByRole('heading',{name:'Scene complete',exact:true})).toBeVisible()
 await page.getByRole('button',{name:'Recall the conversation',exact:true}).click()
 await expect(page.locator('.animated-story aside')).toContainText('现在我们可以一起好好生活了。')
 // Return to the amount for a visual proof with ordinary motion enabled.
 if(route==='medicine'){
  await page.getByRole('button',{name:'← Story library',exact:true}).click();await page.getByRole('button',{name:'02 An Impossible Number',exact:true}).click()
  await card.getByRole('button',{name:'Restart episode',exact:true}).click()
  for(let i=0;i<20;i++){
   if((await page.locator('.episode-line strong').allTextContents()).join('')==='多少？！你再说一次！')break
   if(await page.getByRole('heading',{name:'What do I do?',exact:true}).isVisible())await page.getByRole('button',{name:selections[0],exact:true}).click()
   else await page.getByRole('button',{name:'Continue →',exact:true}).click()
  }
  await expect(page.locator('.episode-line')).toContainText('你再说一次！')
  await page.getByLabel('Reduced motion',{exact:true}).uncheck()
  await page.getByRole('button',{name:'Play audio',exact:true}).click()
  await expect(page.locator('svg.puppet-speaking')).toHaveCount(1)
  await page.screenshot({path:'.local/moonlight-02-'+testInfo.project.name.replaceAll(' ','-')+'.png',fullPage:true})
 }
})
