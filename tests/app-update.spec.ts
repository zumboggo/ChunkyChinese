import {test,expect} from '@playwright/test'
import {readFileSync} from 'node:fs'

test('refresh retires only this app worker and preserves progress and offline downloads',async({page})=>{
 await page.route('**/tests/fixtures/index.html*',route=>route.fulfill({contentType:'text/html',body:'<h1>Fresh app</h1>'}))
 await page.route('**/tests/fixtures/?fresh=*',route=>route.fulfill({contentType:'text/html',body:'<h1>Fresh app</h1>'}))
 await page.route('**/tests/fixtures/update.html',route=>route.fulfill({contentType:'text/html',body:readFileSync('public/update.html','utf8')}))
 await page.goto('/tests/fixtures/index.html')
 await page.evaluate(async()=>{
  const registration=await navigator.serviceWorker.register('/tests/fixtures/stale-app-worker.js',{scope:'/tests/fixtures/'})
  await navigator.serviceWorker.ready
  if(!navigator.serviceWorker.controller)await new Promise<void>(r=>navigator.serviceWorker.addEventListener('controllerchange',()=>r(),{once:true}))
  await (await caches.open('chunky-episode-downloads-v1')).put('/kept-episode.json',new Response('downloaded episode'))
  await new Promise<void>(resolve=>{const r=indexedDB.open('update-progress-test',1);r.onupgradeneeded=()=>r.result.createObjectStore('progress');r.onsuccess=()=>{const db=r.result,t=db.transaction('progress','readwrite');t.objectStore('progress').put({page:2,image:false},'episode18');t.oncomplete=()=>{db.close();resolve()}}})
  return registration.scope
 })
 await page.reload();await expect(page.getByRole('heading',{name:'Old cached app'})).toBeVisible()
 await page.goto('/tests/fixtures/update.html')
 await expect(page.getByRole('heading',{name:'Fresh app'})).toBeVisible()
 expect(await page.evaluate(async()=>await (await(await caches.open('chunky-episode-downloads-v1')).match('/kept-episode.json'))?.text())).toBe('downloaded episode')
 expect(await page.evaluate(()=>new Promise(resolve=>{const r=indexedDB.open('update-progress-test');r.onsuccess=()=>{const q=r.result.transaction('progress').objectStore('progress').get('episode18');q.onsuccess=()=>{resolve(q.result);r.result.close()}}}))).toEqual({page:2,image:false})
 expect(await page.evaluate(async()=>(await navigator.serviceWorker.getRegistrations()).some(r=>r.scope.endsWith('/tests/fixtures/')))).toBe(false)
})

test('production app offers an update without interrupting the current page',async({page},info)=>{
 test.skip(!process.env.TEST_APP_UPDATE_NOTICE,'Requires a production build with its embedded commit')
 const base=process.env.PLAYWRIGHT_BASE_URL!
 let checked=false
 await page.route('**/release.json',async route=>{
  if(!checked){checked=true;await route.fulfill({contentType:'application/json',body:JSON.stringify({commit:'f'.repeat(40)})})}
  else await route.continue()
 })
 await page.goto(base)
 const notice=page.locator('.app-update-notice')
 await expect(notice).toBeVisible()
 await expect(notice).toContainText('Your reading place and downloads will be kept.')
 await page.evaluate(()=>localStorage.setItem('update-retention-check','kept'))
 await page.screenshot({path:info.outputPath('update-notice.png'),fullPage:true})
 await page.getByRole('link',{name:'Update app',exact:true}).click()
 await expect(page).toHaveURL(/fresh=\d+/)
 await expect(page.getByRole('button',{name:'Game',exact:true})).toBeVisible()
 expect(await page.evaluate(()=>localStorage.getItem('update-retention-check'))).toBe('kept')
 await expect(notice).toHaveCount(0)
})
