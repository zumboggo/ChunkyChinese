import {test,expect} from '@playwright/test'
async function open(page:any){await page.goto('/');await page.getByRole('button',{name:'Game',exact:true}).click();await page.getByRole('button',{name:'Chinese cast · angles and acting',exact:true}).click();await expect(page.locator('.angle-comparisons .story-stage')).toHaveCount(2)}
test('Chinese custom views, casts, directions, props and phone framing',async({page},info)=>{
 test.setTimeout(120000);await page.emulateMedia({reducedMotion:'reduce'});await open(page)
 const scope=page.locator('.chinese-angles');
 for(const actor of ['Hyun','Kvothe','Jonathan']){
  await scope.getByLabel('Speaker',{exact:true}).selectOption(actor)
  for(const shot of ['close','wide']){
   await scope.getByLabel('Framing',{exact:true}).selectOption(shot)
   for(const angle of ['front','three-quarter','profile'])for(const facing of ['1','-1']){
    await scope.getByLabel('Angle',{exact:true}).selectOption(angle);await scope.getByLabel('Facing',{exact:true}).selectOption(facing)
    const lead=scope.locator(`[data-actor="${actor}"]`).last(),svg=lead.locator('svg.cartoon-actor');
    await expect(svg).toHaveAttribute('data-angle',angle)
    expect(await svg.innerHTML()).not.toMatch(/NaN|Infinity|<image/)
    await expect(lead.locator('.story-facing')).toHaveCSS('transform',facing==='1'?'matrix(1, 0, 0, 1, 0, 0)':'matrix(-1, 0, 0, 1, 0, 0)')
    if(angle!=='front')await expect(svg.locator('[data-angle-eye]')).toHaveCount(angle==='profile'?1:2)
    await scope.locator('.angle-comparisons > section').last().screenshot({path:`.local/angle-review/${info.project.name}-${actor}-${shot}-${angle}-${facing}.png`})
   }
  }
  for(const prop of ['phone','sword','bow','lance']){await scope.getByLabel('Held object',{exact:true}).selectOption(prop);await expect(scope.locator(`[data-actor="${actor}"] svg`).last()).toHaveAttribute('data-angle','front');await expect(scope.locator(`[data-actor="${actor}"] [data-prop="${prop}"]`)).toHaveCount(2)}
  await scope.getByLabel('Held object',{exact:true}).selectOption('none')
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true)
})
test('interruptions, pause, hidden tab, reduced motion and restored comparison settings',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await open(page);const scope=page.locator('.chinese-angles'),arm=scope.locator('[data-actor="Hyun"] [data-arm="right"]').last()
 await scope.getByLabel('Performance',{exact:true}).selectOption('insist');await page.waitForTimeout(250)
 await scope.getByRole('button',{name:'Pause motion',exact:true}).click();const before=await arm.innerHTML();await page.waitForTimeout(350);expect(await arm.innerHTML()).toBe(before)
 await scope.getByRole('button',{name:'Resume motion',exact:true}).click();await page.waitForTimeout(200);expect(await arm.innerHTML()).not.toBe(before)
 await scope.getByLabel('Performance',{exact:true}).selectOption('reassure');
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))});await page.waitForTimeout(80);const hidden=await arm.innerHTML();await page.waitForTimeout(300);expect(await arm.innerHTML()).toBe(hidden)
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'))})
 await scope.getByLabel('Reduced motion',{exact:true}).check();const still=await arm.innerHTML();await page.waitForTimeout(200);expect(await arm.innerHTML()).toBe(still)
 for(const cue of ['explain','reassure','question','insist','hesitant','nod','shake-head','shrug','laugh','sigh','disappointed','cross-arms']){await scope.getByLabel('Performance',{exact:true}).selectOption(cue);expect(await arm.innerHTML()).not.toMatch(/NaN|Infinity/)}
 await scope.getByLabel('Speaker',{exact:true}).selectOption('Kvothe');await scope.getByLabel('Angle',{exact:true}).selectOption('profile');await page.reload();await page.getByRole('button',{name:'Chinese cast · angles and acting',exact:true}).click();await expect(scope.getByLabel('Speaker',{exact:true})).toHaveValue('Kvothe');await expect(scope.getByLabel('Angle',{exact:true})).toHaveValue('profile')
})
test('Mandarin playback, Continue and saved rehearsal progress',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Game',exact:true}).click();await page.getByText('Practice & demonstrations',{exact:true}).click()
 const card=page.locator('article').filter({has:page.getByRole('heading',{name:'Chinese cast · Angles and acting v1',exact:true})});await card.getByRole('button',{name:'Restart episode',exact:true}).click()
 await page.getByRole('button',{name:'Accept',exact:true}).click()
 await expect(page.locator('.story-stage [data-actor="Hyun"] svg')).toHaveAttribute('data-angle','front')
 await page.getByRole('button',{name:'Play audio',exact:true}).click();await expect(page.locator('svg.puppet-speaking')).toHaveCount(1)
 for(let i=0;i<4;i++)await page.getByRole('button',{name:'Continue →',exact:true}).click()
 await expect(page.locator('.story-stage [data-actor="Hyun"] svg')).toHaveAttribute('data-angle','profile')
 await page.getByRole('button',{name:'← Story library',exact:true}).click();await page.getByText('Practice & demonstrations',{exact:true}).click();await card.getByRole('button',{name:'Play / resume episode',exact:true}).click();await expect(page.locator('.story-stage [data-actor="Hyun"] svg')).toHaveAttribute('data-angle','profile')
 for(let i=0;i<14;i++)await page.getByRole('button',{name:'Continue →',exact:true}).click()
 await expect(page.locator('.story-stage [data-actor="Hyun"] svg')).toHaveAttribute('data-angle','front');await expect(page.locator('[data-actor="Hyun"] [data-prop="sword"]')).toHaveCount(1)
 await page.getByRole('button',{name:'Continue →',exact:true}).click();await expect(page.locator('.story-stage [data-actor="Hyun"] svg')).toHaveAttribute('data-angle','front');await page.getByRole('button',{name:'Continue →',exact:true}).click()
})
