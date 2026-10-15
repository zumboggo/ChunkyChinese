import {test,expect} from '@playwright/test'
import {readFileSync} from 'node:fs'
const pack=JSON.parse(readFileSync('stories/animated/moonlight-08-v2.json','utf8'))
const fixture={...pack,script:`story 2
scene hall
show Hyun determined center
show Dummy neutral right
show Instructor neutral left
look Instructor Hyun
perform Hyun sword-strike Dummy repeat 3 tiring
Instructor [neutral]: 希望你有好运气。
express Hyun disappointed
look Hyun down
rest Hyun downcast
I: 我没有休息。一下，又一下。
I: 六个小时过去了。
end`}
async function open(page:any){
 await page.route('**/stories/animated/gate-in-the-mist.json',route=>route.fulfill({json:fixture}))
 await page.goto('/');await page.getByRole('button',{name:'Game',exact:true}).click()
 await page.getByText('Practice & demonstrations',{exact:true}).click()
 await page.getByRole('button',{name:'Play demonstration'}).click()
}
test('training repeats under Mandarin speech, remains skippable, and cancels on navigation',async({page})=>{
 await open(page)
 const actor=page.locator('[data-actor="Hyun"]'),next=page.getByRole('button',{name:'Continue →',exact:true})
 await expect(next).toBeEnabled()
 await expect(actor.locator('svg[data-response]')).toHaveAttribute('data-response','sword-strike')
 const first=await actor.evaluate((el:HTMLElement)=>el.getAnimations()[0]?.startTime)
 await page.getByRole('button',{name:'Play audio',exact:true}).click()
 await expect(page.locator('[data-actor="Instructor"] .puppet-speaking')).toHaveCount(1)
 await expect(next).toBeEnabled()
 await expect.poll(()=>actor.evaluate((el:HTMLElement)=>el.getAnimations()[0]?.startTime),{timeout:6000}).not.toBe(first)
 await expect(actor.locator('svg')).toHaveAttribute('data-response','sword-strike')
 await page.waitForTimeout(800)
 await page.screenshot({path:`test-results/training-${test.info().project.name.replaceAll(' ','-')}.png`})
 await page.keyboard.press('ArrowRight')
 await expect(actor).toHaveAttribute('data-expression','disappointed')
 await expect(actor).toHaveAttribute('data-gaze','down')
 await expect(actor.locator('[data-prop="sword"]')).toHaveCount(1)
 await expect(actor.locator('svg[data-response]')).toHaveCount(0)
 await expect(page.locator('.puppet-speaking')).toHaveCount(0)
 await page.waitForTimeout(2400)
 await expect(actor.locator('svg[data-response]')).toHaveCount(0)
 await expect(next).toBeEnabled()
})
test('resume and reduced motion restore the pose without replaying strikes',async({page})=>{
 await open(page)
 await page.getByRole('button',{name:'Continue →',exact:true}).click()
 await page.getByRole('button',{name:'← Story library',exact:true}).click()
 await page.getByText('Practice & demonstrations',{exact:true}).click()
 await page.getByRole('button',{name:'Play demonstration'}).click()
 await expect(page.locator('[data-actor="Hyun"]')).toHaveAttribute('data-gaze','down')
 await expect(page.locator('svg[data-response]')).toHaveCount(0)
 await page.getByLabel('Reduced motion',{exact:true}).check()
 await expect(page.locator('.puppet-still')).toHaveCount(2)
 await page.getByRole('button',{name:'Continue →',exact:true}).click()
 await expect(page.getByRole('button',{name:'Continue →',exact:true})).toBeEnabled()
})
