import {expect,type Page} from '@playwright/test'
/** Await the actual interactive choice. Avoid racing the controller listener after Continue. */
export async function chooseEpisodeOption(page:Page,index:number){
 const option=page.getByRole('button',{name:`Choose option ${index+1}`,exact:true})
 await expect(option).toBeEnabled()
 await page.mouse.move(0,0)
 await option.click()
}

export const episodeText=(page:Page)=>page.locator('.episode-line strong').allTextContents().then(parts=>parts.join(''))
/** Wait on observable content, not arbitrary delays after a click. */
export async function continueEpisode(page:Page){
 const before=await page.locator('.animated-story').getAttribute('data-story-step')
 await page.mouse.move(0,0)
 await page.getByRole('button',{name:'Continue →',exact:true}).click()
 await expect.poll(async()=>await page.locator('.animated-story').getAttribute('data-story-step')!==before||await page.getByRole('heading',{name:'Scene complete',exact:true}).isVisible()).toBe(true)
}
export async function reviewEpisodeLine(page:Page,text:string,screenshot:string){
 await expect.poll(()=>episodeText(page)).toBe(text)
 const pause=page.getByRole('button',{name:'Pause audio',exact:true})
 if(await pause.isVisible())await pause.click()
 await expect(page.getByRole('button',{name:'Play audio',exact:true})).toBeVisible()
 await page.getByRole('button',{name:'Play audio',exact:true}).click()
 await expect(pause).toBeVisible()
 await page.waitForTimeout(900) // Inspect acting during real speech, then the reader-held aftermath.
 await page.screenshot({path:screenshot,fullPage:true})
 if(await pause.isVisible())await pause.click()
 await page.waitForTimeout(300)
 await expect.poll(()=>episodeText(page)).toBe(text)
}
