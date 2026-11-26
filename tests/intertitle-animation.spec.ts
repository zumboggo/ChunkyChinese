import {test,expect} from '@playwright/test'

test('new SVG episodes reveal motion after small text pages and restore the reveal',async({page})=>{
 await page.goto('/tests/fixtures/intertitle-animation.html')
 const text=page.locator('.episode-line'),chunks=text.locator('.reader-interlinear-chunk'),stage=page.locator('.story-stage'),next=page.getByRole('button',{name:'Continue →',exact:true})
 await expect(chunks).toHaveCount(3);await expect(stage).toHaveCount(0)
 await next.click();await expect(stage).toBeVisible();await expect(text).toBeHidden()
 await page.reload();await expect(stage).toBeVisible();await expect(text).toBeHidden()
 await page.keyboard.press('ArrowLeft');await expect(chunks).toHaveCount(3);await expect(stage).toHaveCount(0)
 await next.click();await next.click();await next.click();await next.click()
 await expect(chunks).toHaveCount(2);await expect(stage).toHaveCount(0)
 await next.click();await expect(chunks).toHaveCount(3);await expect(stage).toHaveCount(0)
 await next.click();await expect(stage).toBeVisible();await expect(text).toBeHidden()
 await page.keyboard.press('ArrowLeft');await expect(chunks).toHaveCount(3)
})

test('new pixel episodes read all pages before their performance and Back does not add encounters',async({page})=>{
 await page.goto('/tests/fixtures/intertitle-animation.html?pixel=1')
 const chunks=page.locator('.episode-line .reader-interlinear-chunk'),scene=page.locator('.pixel-scene')
 for(let pageIndex=0;pageIndex<12&&await scene.count()===0;pageIndex++){
  expect(await chunks.count()).toBeLessThanOrEqual(3)
  await page.getByRole('button',{name:'Continue →',exact:true}).click()
 }
 await expect(scene).toHaveAttribute('data-pixel-phase','held')
 await page.reload();await expect(scene).toHaveAttribute('data-pixel-phase','held')
 await page.getByRole('button',{name:'Return to passage',exact:true}).click()
 await expect(scene).toHaveCount(0);expect(await chunks.count()).toBeLessThanOrEqual(3)
 await page.getByRole('button',{name:'Continue →',exact:true}).click()
 await expect(scene).toHaveAttribute('data-pixel-phase','held')
 await page.getByRole('button',{name:'Next →',exact:true}).click();await expect(scene).toHaveCount(0)
})
