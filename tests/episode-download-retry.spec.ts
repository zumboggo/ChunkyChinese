import {test,expect,type Page} from '@playwright/test'
import {readFileSync} from 'node:fs'
async function selectEpisode(page:Page,n:number){
 await page.goto('/');await page.getByRole('button',{name:'Game',exact:true}).click()
 await page.getByLabel('Book',{exact:true}).selectOption('jedi')
 await page.getByLabel('Episode',{exact:true}).selectOption({label:n===6?'06 · One Last Signal':'07 · Who Owns a Voice?'})
}
test('Episode 6 continues downloading after twenty seconds on a slow connection',async({page})=>{
 test.setTimeout(60000)
 const pack=readFileSync('public/stories/animated/jedi-06.json','utf8')
 await page.route('**/stories/animated/jedi-06.json',async route=>{await new Promise(r=>setTimeout(r,25000));await route.fulfill({contentType:'application/json',body:pack})})
 await selectEpisode(page,6)
 const play=page.getByRole('button',{name:'Play / resume episode',exact:true});await play.click()
 await expect(page.locator('.episode-open-status')).toContainText('up to two minutes')
 await expect(play).toBeDisabled()
 await expect(page.getByRole('button',{name:'Accept',exact:true})).toBeVisible({timeout:40000})
 await expect(page.getByText(/signal is aborted/)).toHaveCount(0)
})
test('Episode 7 explains a failed download and Play retries without resetting the saved attempt',async({page})=>{
 const pack=readFileSync('public/stories/animated/jedi-07.json','utf8');let attempts=0
 await page.route('**/stories/animated/jedi-07.json',route=>++attempts===1?route.abort('failed'):route.fulfill({contentType:'application/json',body:pack}))
 await selectEpisode(page,7)
 const saved={steps:[],quizzes:[],seed:17}
 await page.evaluate(value=>new Promise<void>((resolve,reject)=>{const request=indexedDB.open('ChunkyChineseStory2',1);request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,tx=db.transaction('records','readwrite');tx.objectStore('records').put(value,'story2:guest:progress:jedi-07-v1');tx.oncomplete=()=>{db.close();resolve()}}}),saved)
 const play=page.getByRole('button',{name:'Play / resume episode',exact:true});await play.click()
 await expect(page.locator('.episode-open-status')).toContainText('Check your connection, then choose Play / resume episode to retry. Your saved progress is safe.')
 await expect(play).toBeEnabled()
 const persisted=await page.evaluate(()=>new Promise(resolve=>{const request=indexedDB.open('ChunkyChineseStory2',1);request.onsuccess=()=>{const db=request.result,r=db.transaction('records').objectStore('records').get('story2:guest:progress:jedi-07-v1');r.onsuccess=()=>{resolve(r.result);db.close()}}}))
 expect(persisted).toEqual(saved)
 await play.click();await expect(page.getByRole('button',{name:'Accept',exact:true})).toBeVisible();expect(attempts).toBe(2)
})
