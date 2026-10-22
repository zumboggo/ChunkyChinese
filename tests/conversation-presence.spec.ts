import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
for(const hybrid of [false,true])test(`conversation presence: ${hybrid?'classroom hybrid':'Mandarin SVG'}`,async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 if(hybrid){const cast=JSON.parse(readFileSync('tests/fixtures/conversation-hybrid.json','utf8'));await page.route('**/fixture-cast.json',r=>r.fulfill({json:cast}));}
 await page.goto('/tests/fixtures/conversation-presence.html'+(hybrid?'?hybrid':''));
 const actors=page.locator('.cartoon-actor');await expect(actors.nth(0)).toHaveAttribute('data-turn','1');await expect(actors.nth(1)).toHaveAttribute('data-turn','-1');await expect(actors.nth(1)).toHaveAttribute('data-listening','guarded');
 await page.waitForTimeout(600);await page.screenshot({path:info.outputPath('conversation.png'),fullPage:true});
 const breath=actors.nth(0).locator('.conversation-breath');
 const start=await breath.evaluate(e=>getComputedStyle(e).transform);await page.waitForTimeout(250);expect(await breath.evaluate(e=>getComputedStyle(e).transform)).not.toBe(start);
 await page.getByRole('button',{name:'Pause scene motion'}).click();await expect(breath).toHaveCSS('animation-play-state','paused');await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));const stopped=await breath.evaluate(e=>getComputedStyle(e).transform);await page.waitForTimeout(250);expect(await breath.evaluate(e=>getComputedStyle(e).transform)).toBe(stopped);
 await page.getByRole('button',{name:'Resume scene motion'}).click();await page.getByRole('button',{name:'Continue',exact:true}).click();await expect(actors.nth(1)).toHaveAttribute('data-listening','warm');
 await page.getByRole('button',{name:'Continue',exact:true}).click();await expect(actors.nth(0)).toHaveAttribute('data-listening','attentive');
 await page.getByRole('button',{name:'Replay saved steps'}).click();await expect(actors.nth(0)).toHaveAttribute('data-listening','attentive');
 await page.getByLabel('Reduced motion',{exact:true}).check();await expect(breath).toHaveCSS('animation-name','none');
 await page.getByRole('button',{name:'Continue',exact:true}).click();await expect(actors.nth(0)).toHaveAttribute('data-turn','0');
 await page.getByRole('button',{name:'Continue',exact:true}).click();await expect(page.locator('[data-prop="sword"]')).toHaveCount(1);await expect(actors.nth(0)).toHaveAttribute('data-turn','0');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
});
