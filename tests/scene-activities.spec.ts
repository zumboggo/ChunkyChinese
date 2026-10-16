import {test,expect} from '@playwright/test';
for(const mode of ['walking','training','eating'])test(`persistent ${mode} responds to dialogue and pause`,async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/tests/fixtures/scene-activities.html'+(mode==='walking'?'':'?'+mode));
 await expect(page.locator('[data-activity]')).toHaveAttribute('data-activity',mode==='training'?'train':mode==='eating'?'eat':'walk');
 await page.waitForTimeout(750);
 await page.getByRole('button',{name:'Continue',exact:true}).click();
 await expect(page.locator('[data-activity]')).not.toHaveAttribute('data-activity-paused','true');
 await page.waitForTimeout(650);
 await page.screenshot({path:info.outputPath('activity.png'),fullPage:true});
 await page.getByRole('button',{name:'Pause scene motion'}).click();
 await expect(page.locator('[data-activity]')).toHaveAttribute('data-activity-paused','true');
 await page.getByRole('button',{name:'Resume scene motion'}).click();
 await page.getByLabel('Reduced motion',{exact:true}).check();
 await expect(page.locator('[data-activity]')).toHaveAttribute('data-activity-paused','true');
 const width=await page.evaluate(()=>({body:document.body.scrollWidth,viewport:innerWidth}));expect(width.body).toBeLessThanOrEqual(width.viewport);
 expect(errors).toEqual([]);
});
