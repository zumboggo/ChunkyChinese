import {expect,type Page} from '@playwright/test'
/** Await the actual interactive choice. Avoid racing the controller listener after Continue. */
export async function chooseEpisodeOption(page:Page,index:number){
 const option=page.getByRole('button',{name:`Choose option ${index+1}`,exact:true})
 await expect(option).toBeEnabled()
 await page.mouse.move(0,0)
 await option.click()
}
