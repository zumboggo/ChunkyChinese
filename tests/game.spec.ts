import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import type { Episode } from '../src/game/model'
const episodes = JSON.parse(readFileSync(new URL('../stories/chengdu/episodes.json', import.meta.url), 'utf8')) as Episode[]

test('plays all three episodes, preserves partial replies, and reports supported completion', async ({ page }, testInfo) => {
  test.setTimeout(180000)
  await page.goto('./')
  await page.getByRole('button', { name: 'Game', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'A little more at home' })).toBeVisible()
  await expect(page.locator('.game-card')).toHaveCount(3)
  await page.screenshot({path:testInfo.outputPath('game-library.png'),fullPage:true})
  for(const [index,ep] of episodes.entries()) {
    await page.locator('.game-card').nth(index).getByRole('button').click()
    await page.getByRole('button',{name:'Enter the neighbourhood',exact:true}).click()
    const frame=page.frameLocator('iframe[title*="playable Twine"]')
    for(const [i,scene] of ep.scenes.entries()) {
      await expect(frame.getByRole('heading',{name:scene.title,exact:true})).toBeVisible()
      await frame.getByRole('button',{name:'Show all',exact:true}).click()
      await frame.getByRole('button',{name:`1. ${scene.choices[0].label}`,exact:true}).click()
      if(index===0&&i===0){
        await page.screenshot({path:testInfo.outputPath('game-conversation.png'),fullPage:true})
        await frame.locator('[data-key="tile-0"]').click()
        await page.getByRole('button',{name:'← Game library'}).click()
        await page.locator('.game-card').nth(0).getByRole('button').click()
        await page.getByRole('button',{name:'Continue conversation',exact:true}).click()
        await expect(frame.locator('.sentence button')).toHaveCount(1)
        await frame.getByRole('button',{name:'Clear',exact:true}).click()
      }
      if(i===1)await frame.getByRole('button',{name:'Hint',exact:true}).click()
      for(let chunk=0;chunk<scene.choices[0].simple.chunks.length;chunk++)await frame.locator(`[data-key="tile-${chunk}"]`).click()
      await frame.getByRole('button',{name:'Check',exact:true}).click()
      await expect(frame.getByText('That works. Here is what happens next.',{exact:true})).toBeVisible()
      await frame.getByRole('button',{name:i===6?'Finish episode':'Continue',exact:true}).click()
    }
    await expect(frame.getByRole('heading',{name:'Things I can now say'})).toBeVisible()
    await expect(frame.getByText('With support',{exact:true})).toHaveCount(1)
    await expect(frame.getByText('Independently',{exact:true})).toHaveCount(6)
    await frame.getByRole('button',{name:'Back to Game',exact:true}).click()
  }
  await expect(page.getByText('✓ Completed',{exact:true})).toHaveCount(3)
  const records=await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('chunky-game:')&&k.endsWith(':first')))
  expect(records).toHaveLength(3)
  await page.locator('.game-card').first().getByRole('button').click()
  await page.getByRole('button',{name:'Replay from the beginning',exact:true}).click()
  const preserved=await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('chunky-game:')&&k.endsWith(':first')))
  expect(preserved).toEqual(records)
})

test('phone navigation fits and wrong answers can recover without restarting', async({page})=>{
  await page.goto('./')
  await page.getByRole('button',{name:'Game',exact:true}).click()
  await page.locator('.game-card').first().getByRole('button').click()
  await page.getByRole('button',{name:'Enter the neighbourhood',exact:true}).click()
  const f=page.frameLocator('iframe')
  await f.getByRole('button',{name:'Show all',exact:true}).click()
  await f.getByRole('button',{name:'1. Say that I live here',exact:true}).click()
  for(let n=0;n<2;n++){
    for(const i of [2,1,0])await f.locator(`[data-key="tile-${i}"]`).click()
    await f.getByRole('button',{name:'Check',exact:true}).click()
    await f.getByRole('button',{name:'Clear',exact:true}).click()
  }
  await f.getByRole('button',{name:'Show worked answer',exact:true}).click()
  await f.getByRole('button',{name:'Check',exact:true}).click()
  await expect(f.getByRole('button',{name:'Continue',exact:true})).toBeVisible()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true)
})


test('opened episode and Mandarin audio reopen offline in a production build',async({page,context})=>{
  test.skip(process.env.GAME_PRODUCTION_TEST !== '1','Requires the production preview server for a cold app reload.')
  await page.goto('./')
  await page.getByRole('button',{name:'Game',exact:true}).click()
  await page.locator('.game-card').first().getByRole('button').click()
  await page.getByRole('button',{name:'Enter the neighbourhood',exact:true}).click()
  await expect(page.getByText(/Episode downloaded/)).toBeVisible()
  await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller))
  const f=page.frameLocator('iframe')
  await f.getByRole('button',{name:'Show all',exact:true}).click()
  await f.getByRole('button',{name:'1. Say that I live here',exact:true}).click()
  await f.locator('[data-key="tile-0"]').click()
  await expect(f.locator('.sentence button')).toHaveCount(1)
  await context.setOffline(true)
  await page.reload({waitUntil:'domcontentloaded'})
  await page.getByRole('button',{name:'Game',exact:true}).click()
  await page.locator('.game-card').first().getByRole('button').click()
  await page.getByRole('button',{name:'Continue conversation',exact:true}).click()
  await expect(f.locator('.sentence button')).toHaveCount(1)
  const duration=await page.evaluate(async()=>{
    const cache=await caches.open('chunky-game-v1')
    const urls=(await cache.keys()).filter(r=>r.url.endsWith('.m4a'))
    return Promise.all(urls.map(r=>new Promise<number>((resolve,reject)=>{
      const audio=new Audio(r.url);audio.preload='metadata'
      const timer=setTimeout(()=>reject(new Error('Audio metadata timed out')),10000)
      audio.onloadedmetadata=()=>{clearTimeout(timer);resolve(audio.duration)}
      audio.onerror=()=>{clearTimeout(timer);reject(new Error(r.url))}
    })))
  })
  expect(duration.length).toBeGreaterThan(15)
  expect(duration.every(n=>n>0&&Number.isFinite(n))).toBe(true)
})

test('keeps missing artwork playable and rejects messages from the wrong frame',async({page})=>{
  await page.route('**/characters.webp',route=>route.abort())
  await page.goto('./')
  await page.getByRole('button',{name:'Game',exact:true}).click()
  await page.locator('.game-card').first().getByRole('button').click()
  await page.getByRole('button',{name:'Enter the neighbourhood',exact:true}).click()
  const f=page.frameLocator('iframe')
  await expect(f.getByText(/Ms Lin · my neighbour/)).toBeVisible()
  const before=await page.evaluate(()=>Object.entries(localStorage).find(([k])=>k==='chunky-game:v1:guest:neighbour:1')?.[1])
  await page.evaluate(()=>{
    const frame=document.querySelector('iframe')!
    const channel=new URL(frame.src).hash.split('channel=')[1]
    window.postMessage({protocol:'chunky-game-v1',channel,type:'action',revision:0,action:{type:'showAll'}},location.origin)
  })
  const after=await page.evaluate(()=>localStorage.getItem('chunky-game:v1:guest:neighbour:1'))
  expect(after).toBe(before)
  await f.getByRole('button',{name:'Show all',exact:true}).click()
  await expect(f.getByRole('button',{name:'1. Say that I live here',exact:true})).toBeVisible()
})

test('controller-style keys and window changes preserve the same sentence',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'})
  await page.goto('./')
  await page.getByRole('button',{name:'Game',exact:true}).click()
  await page.getByRole('button',{name:'Talk to Ms Lin',exact:false}).click()
  await page.getByRole('button',{name:'Enter the neighbourhood',exact:true}).click()
  const f=page.frameLocator('iframe')
  await f.getByRole('button',{name:'Show all',exact:true}).click()
  await expect(f.getByRole('button',{name:'1. Say that I live here',exact:true})).toBeVisible()
  await page.keyboard.press('1')
  await expect(f.getByRole('heading',{name:'Say that I live here'})).toBeVisible()
  await page.keyboard.press('3')
  await expect(f.locator('.sentence button')).toHaveCount(1)
  await page.getByRole('button',{name:'Window',exact:true}).click()
  await expect(f.locator('.sentence button')).toHaveCount(1)
  await page.keyboard.press('2')
  await expect(f.locator('.sentence button')).toHaveCount(2)
  await page.keyboard.press('1')
  await expect(f.locator('.sentence button')).toHaveCount(3)
  await f.getByRole('button',{name:'Check',exact:true}).click()
  await expect(f.getByRole('button',{name:'Continue',exact:true})).toBeVisible()
})
