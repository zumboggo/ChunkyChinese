import {expect,type Page} from '@playwright/test'
export async function selectSettings(page:Page,title:string){
 await expect(page.locator('.settings-workspace')).toBeVisible()
 const picker=page.getByLabel('Settings section',{exact:true})
 if(await picker.isVisible())await picker.selectOption(title)
 else await page.getByRole('navigation',{name:'Settings sections'}).getByRole('button',{name:title+' settings',exact:true}).click()
 await expect(page.getByRole('region',{name:title,exact:true})).toBeVisible()
}
