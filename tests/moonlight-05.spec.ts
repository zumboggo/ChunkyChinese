import {test,expect} from '@playwright/test'
for(const route of ['stronger','future'])test(`Moonlight 05 ${route}: choices, aids, decoded audio and resume`,async({page},info)=>{
 await page.goto('/');await page.getByRole('button',{name:'Game',exact:true}).click()
 await page.getByRole('button',{name:'05 A Year Before the Game',exact:true}).click()
 await page.getByRole('button',{name:'Play / resume episode',exact:true}).click()
 if(route==='future')await page.emulateMedia({reducedMotion:'reduce'})
 await expect(page.locator('[data-face="scrappy"]')).toHaveCount(1)
 let choices=0,callbacks=0,heard=false,resumed=false
 for(let i=0;i<65;i++){
  if(await page.getByRole('heading',{name:'Scene complete',exact:true}).isVisible())break
  if(await page.locator('.episode-choice').count()){
   const options=route==='stronger'?['我要比现在更强一点。','先看大家都在玩什么。']:['我想把以后的日子过好。','先看游戏里能做什么。']
   const option=page.getByRole('button',{name:options[choices],exact:true})
   await expect(option).toBeEnabled()
   await expect(option.locator('.reader-interlinear-chunk').first()).toBeVisible()
   await expect(option).toHaveCSS('background-color',/rgb\((255, 253, 247|237, 243, 233)\)/)
   expect(await option.evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true)
   await page.screenshot({path:'.local/moonlight-05-'+route+'-'+choices+'-'+info.project.name.replaceAll(' ','-')+'.png',fullPage:true})
   await option.click();choices++
  }else{
   const text=(await page.locator('.episode-line strong').allTextContents()).join('')
   if(!heard){
    const pinyin=page.getByRole('button',{name:'Pinyin',exact:true}),english=page.getByRole('button',{name:'English',exact:true})
    await pinyin.click();await expect(page.locator('.reader-interlinear-pinyin')).toHaveCount(0);await pinyin.click()
    await english.click();await expect(page.locator('.reader-interlinear-gloss')).toHaveCount(0);await english.click()
    await page.getByRole('button',{name:'Play audio',exact:true}).click()
    await expect(page.getByRole('button',{name:'Pause audio',exact:true})).toBeVisible();heard=true
    expect(await page.evaluate(async()=>{const p=await (await fetch('/stories/animated/moonlight-05.json')).json();const src=Object.values(p.chinese.lines)[0] as {audio:string};const ctx=new AudioContext();const b=await ctx.decodeAudioData(await (await fetch(src.audio)).arrayBuffer());await ctx.close();return b.duration})).toBeGreaterThan(0)
   }
   if(text.includes('白天让身体变强')&&!resumed){
    await page.getByRole('button',{name:'← Story library',exact:true}).click();await page.getByRole('button',{name:'05 A Year Before the Game',exact:true}).click();await page.getByRole('button',{name:'Play / resume episode',exact:true}).click()
    await expect.poll(async()=>(await page.locator('.episode-line strong').allTextContents()).join('')).toContain('白天让身体变强');resumed=true
   }
   const cb=route==='stronger'?['我想比现在更强一点。现在，我知道怎么做了。','我要找人多的地方。现在，大家都到这里来了。']:['想过好日子，就得先把眼前的事做好。','这一年写下来的东西，都有用了。我知道自己要去哪里了。']
   if(cb.includes(text))callbacks++
   await page.getByRole('button',{name:'Continue →',exact:true}).click()
  }
 }
 expect({choices,callbacks,heard,resumed}).toEqual({choices:2,callbacks:2,heard:true,resumed:true})
 await expect(page.getByRole('heading',{name:'Scene complete',exact:true})).toBeVisible()
})
