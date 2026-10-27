import {test,expect,type Page} from '@playwright/test'
async function open(page:Page){
 await page.goto('/');await page.getByRole('button',{name:'Game',exact:true}).click()
 await page.getByLabel('Book',{exact:true}).selectOption('lms');await page.getByLabel('Episode',{exact:true}).selectOption('moonlight-27-v2')
 await page.locator('.featured-episode').getByRole('button',{name:'Restart episode',exact:true}).click()
 await page.getByRole('button',{name:'Accept',exact:true}).click();await page.getByRole('button',{name:'Skip intro →',exact:true}).click()
 await expect(page.locator('.story-slide-toggles')).toBeVisible()
}
test.beforeEach(async({page})=>{
 await page.addInitScript(()=>{
  const w=window as any;w.audioEvents=[];w.lastAudio=null;w.lastSpeech=null
  class AudioMock{volume=1;onended:any;onerror:any;paused=false;constructor(public src:string){w.lastAudio=this}play(){w.audioEvents.push('Chinese');return Promise.resolve()}pause(){this.paused=true;w.audioEvents.push('stop Chinese')}}
  w.Audio=AudioMock;w.SpeechSynthesisUtterance=class{constructor(public text:string){} lang='';volume=1;onend:any;onerror:any}
  Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{getVoices:()=>[],speak:(u:any)=>{w.lastSpeech=u;w.audioEvents.push(u.lang)},cancel:()=>w.audioEvents.push('stop English')}})
 })
})
test('five independent text/audio buttons persist across slides and reloads',async({page},info)=>{
 await open(page);const toolbar=page.locator('.story-slide-toggles');await expect(toolbar.getByRole('button')).toHaveCount(5)
 for(const [label,selector] of [['Pinyin','.reader-interlinear-pinyin'],['Characters','strong[lang="zh-CN"]'],['English','.reader-interlinear-gloss']]){
  const button=page.getByRole('button',{name:'Text: '+label,exact:true});await expect(button).toHaveAttribute('aria-pressed','true');await button.click();await expect(page.locator('.episode-line').locator(selector)).toHaveCount(0)
 }
 await page.getByRole('button',{name:'Audio: Chinese',exact:true}).click()
 await page.getByRole('button',{name:'Continue →',exact:true}).click()
 await expect(page.locator('.episode-line strong,.episode-line .reader-interlinear-pinyin,.episode-line .reader-interlinear-gloss')).toHaveCount(0)
 await page.getByRole('button',{name:'Text: Pinyin',exact:true}).focus();await page.keyboard.press('Space')
 await expect(page.getByRole('button',{name:'Text: Pinyin',exact:true})).toHaveAttribute('aria-pressed','true')
 await expect(page.locator('.episode-line .reader-interlinear-pinyin').first()).toBeVisible()
 await page.screenshot({path:'.local/toggles-'+info.project.name+'.png',fullPage:true})
 await open(page)
 for(const name of ['Text: Characters','Text: English','Audio: Chinese','Audio: English'])await expect(page.getByRole('button',{name,exact:true})).toHaveAttribute('aria-pressed','false')
 await expect(page.getByRole('button',{name:'Text: Pinyin',exact:true})).toHaveAttribute('aria-pressed','true')
 expect(await toolbar.evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true)
})
test('language toggles control current and subsequent slide audio without overlap',async({page})=>{
 await open(page);await expect.poll(()=>page.evaluate(()=>(window as any).audioEvents.includes('Chinese'))).toBe(true)
 await page.getByRole('button',{name:'Audio: Chinese',exact:true}).click();await expect.poll(()=>page.evaluate(()=>(window as any).lastAudio.paused)).toBe(true)
 await page.getByRole('button',{name:'Audio: English',exact:true}).click();await expect.poll(()=>page.evaluate(()=>(window as any).audioEvents.at(-1))).toBe('en-US')
 await page.getByRole('button',{name:'Continue →',exact:true}).click();await expect.poll(()=>page.evaluate(()=>(window as any).audioEvents.slice(-2))).toEqual(['stop English','en-US'])
 await page.getByRole('button',{name:'Audio: Chinese',exact:true}).click();await expect.poll(()=>page.evaluate(()=>(window as any).audioEvents.at(-1))).toBe('Chinese')
 await page.evaluate(()=>(window as any).lastAudio.onended());await expect.poll(()=>page.evaluate(()=>(window as any).audioEvents.at(-1)),{timeout:6000}).toBe('en-US')
 await page.getByRole('button',{name:'Audio: English',exact:true}).click();await expect.poll(()=>page.evaluate(()=>(window as any).audioEvents.at(-1))).toBe('Chinese')
 await page.getByRole('button',{name:'Audio: Chinese',exact:true}).click();await page.evaluate(()=>(window as any).audioEvents=[])
 await page.getByRole('button',{name:'Continue →',exact:true}).click();await page.waitForTimeout(200);expect(await page.evaluate(()=>(window as any).audioEvents)).toEqual([])
})
