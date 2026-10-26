import { test, expect } from '@playwright/test'
test('Jedi water episode starts from the public library', async ({ page }) => {
 const errors:string[]=[]
 page.on('pageerror', error=>errors.push(error.message))
 await page.goto('./')
 await page.getByRole('button',{name:'Game',exact:true}).click()
 await page.getByLabel('Book',{exact:true}).selectOption('jedi')
 await page.getByRole('button',{name:'Play / resume episode',exact:true}).click()
 const accept=page.getByRole('button',{name:'Accept',exact:true})
 await expect(accept).toBeVisible()
 await expect(page.locator('.story-disclaimer p')).toHaveCSS('color','rgb(246, 237, 219)')
 await page.screenshot({path:'/tmp/jedi-notice-fixed.png',fullPage:true})
 await accept.click()
 const skip=page.getByRole('button',{name:'Skip intro →',exact:true})
 await expect(skip).toBeVisible(); await skip.click()
 await expect(page.locator('.episode-line'),JSON.stringify(errors)).toBeVisible()
 await expect(page.locator('.episode-line')).toContainText('我是')
 expect(errors).toEqual([])
})
