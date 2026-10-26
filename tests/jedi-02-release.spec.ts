import {test,expect,type Page} from '@playwright/test'
async function openEpisode(page:Page){
 await page.goto('/');await page.getByRole('button',{name:'Game',exact:true}).click()
 await page.getByLabel('Book',{exact:true}).selectOption('jedi')
 await page.getByLabel('Episode',{exact:true}).selectOption({label:'02 · The Last Door'})
 await page.getByRole('button',{name:'Play / resume episode',exact:true}).click()
 await page.getByRole('button',{name:'Accept',exact:true}).click()
 await page.getByRole('button',{name:/Skip context|Continue to teaser/}).click()
}
test('episode 2 anime teaser completes into story and restart preserves skip',async({page},info)=>{
 await openEpisode(page)
 const video=page.locator('video');await expect(video).toBeVisible()
 await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThanOrEqual(2)
 expect(await video.evaluate((v:HTMLVideoElement)=>v.duration)).toBeCloseTo(9,0)
 await page.screenshot({path:info.outputPath('anime-teaser.png'),fullPage:true})
 await video.evaluate(async(v:HTMLVideoElement)=>{v.muted=true;await v.play();v.currentTime=v.duration-.3})
 await expect(page.locator('.episode-line')).toContainText('孩子和妈妈')
 await page.getByRole('button',{name:'Restart episode',exact:true}).click()
 await page.getByRole('button',{name:'Accept',exact:true}).click()
 await page.getByRole('button',{name:/Skip context|Continue to teaser/}).click()
 await page.getByRole('button',{name:'Skip intro →',exact:true}).click()
 await expect(page.locator('.episode-line')).toContainText('孩子和妈妈')
})
test('episode 2 missing teaser remains skippable with reduced motion',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.route('**/jedi-02-intro.mp4',r=>r.abort())
 await openEpisode(page)
 await page.getByRole('button',{name:'Continue to episode →',exact:true}).click()
 await expect(page.locator('.episode-line')).toContainText('孩子和妈妈')
})
