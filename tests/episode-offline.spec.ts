import {test,expect} from '@playwright/test'

// Run against a production preview so the real service worker and hashed
// player chunks are exercised: PLAYWRIGHT_BASE_URL=http://127.0.0.1:4173.
test('downloads the library and opens an episode after an offline reload',async({page,context})=>{
 test.skip(!process.env.PLAYWRIGHT_BASE_URL?.includes(':4173'),'Requires production preview')
 test.setTimeout(180_000)
 await page.goto('/')
 await page.getByRole('button',{name:'Game',exact:true}).click()
 await page.getByText('Offline episodes',{exact:true}).click()
 await page.getByRole('button',{name:'Download all episodes',exact:true}).click()
 await expect(page.getByText(/All \d+ episodes saved for offline play/)).toBeVisible({timeout:150_000})
 await context.setOffline(true)
 await page.reload()
 await page.getByRole('button',{name:'Game',exact:true}).click()
 await page.locator('.episode-primary').click()
 await expect(page.locator('.episode-intro,.animated-story,.episode-context-crawl').first()).toBeVisible({timeout:15_000})
 const video=page.locator('.episode-intro video')
 if(await video.count())await expect.poll(()=>video.evaluate((el:HTMLVideoElement)=>el.readyState)).toBeGreaterThanOrEqual(2)
 await context.setOffline(false)
})
