import {test,expect,type Page} from '@playwright/test'

async function start(page:Page){
 await page.emulateMedia({reducedMotion:'reduce'})
 await page.addInitScript(()=>{
  // Deterministic audio completions let the test check sequence and cancellation,
  // without depending on installed voices or a sound device on the test machine.
  Math.random=()=>0
  const events:string[]=[]
  Object.assign(window,{audioModeEvents:events})
  const timers=new WeakMap<HTMLMediaElement,ReturnType<typeof setTimeout>>()
  HTMLMediaElement.prototype.play=function(){
   events.push('chinese')
   timers.set(this,setTimeout(()=>this.dispatchEvent(new Event('ended')),160))
   return Promise.resolve()
  }
  HTMLMediaElement.prototype.pause=function(){clearTimeout(timers.get(this))}
  let speechTimer:ReturnType<typeof setTimeout>
  Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[],speak:(utterance:SpeechSynthesisUtterance)=>{events.push(utterance.lang+':'+utterance.text);speechTimer=setTimeout(()=>utterance.dispatchEvent(new Event('end')),30)},cancel:()=>clearTimeout(speechTimer)}})
 })
 await page.goto('/')
 await page.getByRole('button',{name:'Game',exact:true}).click()
 await page.locator('.featured-episode').getByRole('button',{name:/Play \/ resume episode/}).click()
 await page.getByRole('button',{name:'Skip intro →',exact:true}).click()
}

const controls=(page:Page)=>page.locator('.episode-settings>summary')
const count=(page:Page,n:number)=>page.getByRole('group',{name:'Number of encounters'}).getByRole('button',{name:String(n),exact:true}).click()
const step=(page:Page)=>page.locator('.animated-story').getAttribute('data-story-step')
async function next(page:Page){const before=await step(page);await page.getByRole('button',{name:'Continue →',exact:true}).click();await expect.poll(()=>step(page)).not.toBe(before)}

test('encounter editor saves independent settings and retains disabled encounters',async({page},info)=>{
 await start(page);await controls(page).click()
 await expect(page.getByRole('button',{name:'Audio Mode',exact:true})).toHaveCount(0)
 await expect(page.getByRole('group',{name:'Number of encounters'}).getByRole('button',{name:'2',exact:true})).toHaveAttribute('aria-pressed','true')
 const before=await step(page)
 await count(page,3);await page.getByRole('tab',{name:'Encounter 3'}).click()
 await expect(page.getByRole('checkbox',{name:'Spoken Chinese',exact:true})).toBeDisabled()
 await page.getByRole('checkbox',{name:'Pinyin',exact:true}).check()
 await page.getByRole('checkbox',{name:'Spoken Chinese',exact:true}).uncheck()
 await expect.poll(()=>step(page)).toBe(before)
 await count(page,1);await count(page,3);await page.getByRole('tab',{name:'Encounter 3'}).click()
 await expect(page.getByRole('checkbox',{name:'Pinyin',exact:true})).toBeChecked()
 await page.screenshot({path:`.local/design/encounters-${info.project.name}.png`,fullPage:true})
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await controls(page).click();await next(page);await next(page);await next(page);await page.reload();await page.getByRole('button',{name:'Game',exact:true}).click()
 await page.locator('.featured-episode').getByRole('button',{name:/resume/i}).click()
 await expect(page.locator('.episode-settings>summary').or(page.getByRole('button',{name:'Skip intro →',exact:true}))).toBeVisible()
 if(await page.getByRole('button',{name:'Skip intro →',exact:true}).isVisible())await page.getByRole('button',{name:'Skip intro →',exact:true}).click()
 await controls(page).click();await page.getByRole('tab',{name:'Encounter 3'}).click()
 await expect(page.getByRole('checkbox',{name:'Pinyin',exact:true})).toBeChecked()
 await page.getByRole('button',{name:'Reset encounters'}).click()
 await expect(page.getByRole('tab')).toHaveCount(2)
})

test('Continue and Back traverse encounters before moving the story',async({page})=>{
 await start(page);await controls(page).click();await count(page,3);await controls(page).click()
 const original=(await step(page))!.split(':')[0]
 await next(page);await expect(page.getByText('Encounter 2 of 3',{exact:true})).toBeVisible()
 await next(page);await expect(page.getByText('Encounter 3 of 3',{exact:true})).toBeVisible()
 expect((await step(page))!.split(':')[0]).toBe(original)
 await expect(page.locator('.episode-line')).toBeEmpty()
 await next(page);expect((await step(page))!.split(':')[0]).not.toBe(original)
 await page.getByRole('button',{name:'Back',exact:true}).click()
 await expect.poll(()=>step(page)).toBe(original+':3')
 await page.getByRole('button',{name:'Back',exact:true}).click();await expect.poll(()=>step(page)).toBe(original+':2')
 await controls(page).click();await count(page,1);await controls(page).click()
 await expect.poll(()=>step(page)).toBe(original+':1');await next(page)
 expect((await step(page))!.split(':')[0]).not.toBe(original)
})

test('automatic playback respects silent reading time and pauses for Controls',async({page})=>{
 await start(page);await controls(page).click();await count(page,3)
 await page.getByRole('checkbox',{name:'Spoken Chinese',exact:true}).uncheck()
 await page.getByRole('checkbox',{name:'Automatic playback',exact:true}).check()
 await page.getByText('Playback options',{exact:true}).click()
 await page.getByLabel('Reading time',{exact:true}).selectOption('3')
 const before=await step(page)
 await page.waitForTimeout(3300);expect(await step(page)).toBe(before)
 await controls(page).click();await page.waitForTimeout(700);expect(await step(page)).toBe(before)
 await expect.poll(()=>step(page),{timeout:6000}).not.toBe(before)
 await page.getByRole('button',{name:'Pause playback',exact:true}).click()
 const paused=await step(page);await page.waitForTimeout(1000);expect(await step(page)).toBe(paused)
 await page.getByRole('button',{name:'Resume playback',exact:true}).click()
 await expect.poll(()=>step(page),{timeout:6000}).not.toBe(paused)
})

test('Super Supportive uses three encounters and keeps its settings separate',async({page})=>{
 await start(page);await controls(page).click();await count(page,1);await controls(page).click()
 await page.getByRole('button',{name:'← Story library',exact:true}).click()
 await page.getByRole('button',{name:/Choose story/}).click();await page.getByLabel('Book',{exact:true}).selectOption('super-supportive')
 await page.locator('.featured-episode').getByRole('button',{name:/Play \/ resume episode/}).click()
 await page.getByRole('button',{name:'Accept',exact:true}).click()
 await page.getByRole('button',{name:'Skip intro →',exact:true}).click()
 await controls(page).click()
 await expect(page.getByRole('tab')).toHaveCount(3)
 for(const name of ['Chinese characters','Pinyin','English text','Spoken Chinese'])await expect(page.getByRole('checkbox',{name,exact:true})).toBeChecked()
 await expect(page.getByRole('checkbox',{name:'Spoken English',exact:true})).not.toBeChecked()
 await page.getByRole('tab',{name:'Encounter 2'}).click()
 await expect(page.getByRole('checkbox',{name:'Chinese characters',exact:true})).toBeChecked()
 await expect(page.getByRole('checkbox',{name:'Spoken Chinese',exact:true})).toBeChecked()
 await expect(page.getByRole('checkbox',{name:'Pinyin',exact:true})).not.toBeChecked()
 await page.getByRole('tab',{name:'Encounter 3'}).click()
 await expect(page.getByRole('checkbox',{name:'Spoken Chinese',exact:true})).toBeDisabled()
 await page.getByRole('button',{name:'← Story library',exact:true}).click()
 await page.getByRole('button',{name:/Choose story/}).click();await page.getByLabel('Book',{exact:true}).selectOption('lms')
 await page.locator('.featured-episode').getByRole('button',{name:/Play \/ resume episode/}).click()
 await page.getByRole('button',{name:'Skip intro →',exact:true}).click()
 await controls(page).click();await expect(page.getByRole('tab')).toHaveCount(1)
})

test('bilingual speech is ordered and opening Controls cancels speech',async({page})=>{
 await start(page);await controls(page).click()
 await page.getByRole('checkbox',{name:'Spoken English',exact:true}).check()
 await page.getByText('Playback options',{exact:true}).click()
 await page.getByLabel('Pause before English',{exact:true}).selectOption('0')
 await page.evaluate(()=>{(window as unknown as {audioModeEvents:string[]}).audioModeEvents.length=0})
 await controls(page).click()
 await expect.poll(()=>page.evaluate(()=>(window as unknown as {audioModeEvents:string[]}).audioModeEvents.some(e=>e.startsWith('en-US:')))).toBe(true)
 const events=await page.evaluate(()=>(window as unknown as {audioModeEvents:string[]}).audioModeEvents)
 expect(events.indexOf('chinese')).toBeLessThan(events.findIndex(e=>e.startsWith('en-US:')))
 await expect(page.getByRole('button',{name:'Play audio',exact:true})).toBeVisible()
 await controls(page).click();await page.getByLabel('Pause before English',{exact:true}).selectOption('3')
 await controls(page).click();await expect(page.getByRole('button',{name:'Pause audio',exact:true})).toBeVisible()
 await controls(page).click();await expect(page.getByRole('button',{name:'Play audio',exact:true})).toBeVisible()
 const before=await step(page);await page.waitForTimeout(3200);expect(await step(page)).toBe(before)
})
