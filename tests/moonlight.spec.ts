import {test,expect} from '@playwright/test'
for(const route of ['promise','humor'] as const)test(`Moonlight ${route}: audio, choices, resume and canonical ending`,async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Game',exact:true}).click()
 await page.getByRole('button',{name:'Restart episode',exact:true}).click()
 await expect(page.locator('.chinese-line')).toContainText('我叫李贤')
 await expect(page.locator('.story-stage svg')).toHaveCount(1)
 await page.getByLabel('Reduced motion',{exact:true}).check()
 await page.getByRole('button',{name:'Continue →',exact:true}).click()
 await page.getByRole('button',{name:'Listen / Replay',exact:true}).click()
 await expect(page.locator('svg.puppet-speaking')).toHaveCount(1)
 await page.getByRole('button',{name:'Show meaning',exact:true}).click()
 await expect(page.getByText('Work, work, and more work every day. Will my body get too tired?',{exact:true})).toBeVisible()
 let choices=0,callback=false
 for(let i=0;i<65;i++){
  if(await page.getByRole('heading',{name:'Scene complete',exact:true}).isVisible())break
  const text=await page.locator('.story-dialogue').innerText()
  if(text.includes('What do I do?')){
   const labels=route==='promise'?['我会照顾她的。','想想家里需要的钱。','希望还能买点药。']:['她那么聪明，不会有事的。','最后再看看我的东西。','希望能买衣服。']
   await page.locator('button[data-next]').filter({hasText:labels[choices]}).click();choices++
   if(choices===2){const before=await page.locator('.chinese-line').innerText();await page.getByRole('button',{name:'← Story library',exact:true}).click();await page.getByRole('button',{name:'Play / resume episode',exact:true}).click();await expect(page.locator('.chinese-line')).toHaveText(before)}
  }else{
   if(text.includes(route==='promise'?'我说了要照顾家人':'好，游戏高手'))callback=true
   await page.getByRole('button',{name:'Continue →',exact:true}).click()
  }
 }
 expect(choices).toBe(3);expect(callback).toBe(true)
 await expect(page.getByRole('heading',{name:'Scene complete',exact:true})).toBeVisible()
 await page.getByRole('button',{name:'Recall the conversation',exact:true}).click()
 await expect(page.locator('.animated-story aside')).toContainText('我没有删除账号。我让别人来买。')
 await expect(page.locator('.animated-story aside')).toContainText('我去睡觉了。')
})
