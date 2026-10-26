import {test,expect} from '@playwright/test'
import {readFileSync} from 'node:fs'
const catalog=JSON.parse(readFileSync('public/stories/animated/catalog.json','utf8'))
test('book selection, resume and the next episode keep their sequence',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Game',exact:true}).click()
 const books=page.getByLabel('Book',{exact:true}),episodes=page.getByLabel('Episode',{exact:true})
 await expect(episodes.locator('option')).toHaveCount(catalog.filter((e:{category:string})=>e.category==='lms').length)
 await books.selectOption('daily-life');await expect(page.getByText('No Daily Life episodes yet.',{exact:false})).toBeVisible()
 await books.selectOption('lms');await episodes.selectOption({index:0})
 await page.getByRole('button',{name:'Restart episode',exact:true}).click()
 await page.getByRole('button',{name:'Skip intro →',exact:true}).click()
 await expect(page.locator('.episode-line')).toBeVisible()
 await page.getByRole('button',{name:'Continue →',exact:true}).click()
 const text=await page.locator('.episode-line').innerText()
 await page.getByRole('button',{name:'← Story library',exact:true}).click()
 await page.getByRole('button',{name:'Play / resume episode',exact:true}).click()
 await expect(page.locator('.episode-line')).toHaveText(text,{useInnerText:true})
 for(let i=0;i<100;i++){
  if(await page.getByRole('heading',{name:'Scene complete',exact:true}).count())break
  if(await page.locator('.episode-choice').count())await page.locator('.episode-choice').first().click()
  else await page.getByRole('button',{name:'Continue →',exact:true}).click()
 }
 await page.getByRole('button',{name:'Continue to Episode 2 →',exact:true}).click()
 await expect(page.getByRole('heading',{name:'Moonlight Sculptor 02 · An Impossible Number',exact:true})).toBeVisible()
 await page.getByRole('button',{name:'← Story library',exact:true}).click()
 await books.selectOption('name-of-the-wind')
 await expect(episodes.locator('option')).toHaveCount(catalog.filter((e:{category:string})=>e.category==='name-of-the-wind').length)
 await episodes.selectOption({index:catalog.filter((e:{category:string})=>e.category==='name-of-the-wind').length-1})
 await expect(page.getByRole('button',{name:'Next →',exact:true})).toBeDisabled()
})
