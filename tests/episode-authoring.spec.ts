import {test,expect} from '@playwright/test'
import {readFileSync} from 'node:fs'
import type {ChinesePackage} from '../src/game/animation/package'
type Beat={type:string;text:string;option?:string}
type Fixture={packagePath:string;routes:{choices:string[];beats:Beat[]}[]}
const fixture:Fixture=process.env.EPISODE_FIXTURE?JSON.parse(readFileSync(process.env.EPISODE_FIXTURE,'utf8')):{packagePath:'',routes:[]}
for(const [index,route] of fixture.routes.entries())test(`authoring route ${index+1}: ${route.choices.join('/')}`,async({page},info)=>{
 const retryTargets=JSON.parse(process.env.EPISODE_RETRY_TARGETS??'[]') as {title:string;project:string}[]
 test.skip(retryTargets.length>0&&!retryTargets.some(t=>t.title===info.title&&t.project===info.project.name),'Outside diagnostic retry')
 const pack=JSON.parse(readFileSync(fixture.packagePath,'utf8')) as ChinesePackage
 await page.goto('/');await page.getByRole('button',{name:'Game',exact:true}).click()
 await expect(page.locator('.game-page > p[role=status]').first()).toContainText(/Stories and drafts|Draft saved/ )
 await page.getByLabel('Import episode ZIP / JSON').setInputFiles(fixture.packagePath)
 await expect(page.getByLabel('Episode title',{exact:true})).toHaveValue(pack.title)
 await page.getByRole('button',{name:'Publish to my library',exact:true}).click()
 const open=async()=>{
  const category=/^Moonlight(?: Sculptor)?\s+\d+\b/i.test(pack.title)?/LMS A new world/:/Daily Life Small moments/
  await page.getByRole('button',{name:category}).click()
  await page.locator('.episode-strip button').filter({hasText:pack.title}).last().click()
  await page.locator('.featured-episode').getByRole('button',{name:'Play / resume episode',exact:true}).click()
 }
 await open()
 if(index%2)await page.emulateMedia({reducedMotion:'reduce'})
 let heard=false,resumed=false
 const currentText=()=>page.evaluate(()=>{
  const line=document.querySelector('.episode-line')
  return line?[...line.querySelectorAll('strong')].map(e=>e.textContent).join(''):document.querySelector('.story-dialogue > p')?.textContent??''
 })
 for(const [i,beat] of route.beats.entries()){
  if(beat.type==='choice'){
   const option=page.getByRole('button',{name:beat.text,exact:true});await expect(option).toBeEnabled()
   const chunks=option.locator('.reader-interlinear-chunk');if(pack.chinese?.lines[beat.text])await expect(chunks.first()).toBeVisible()
   expect(await option.evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true)
   // Keep the previous Continue pointer off the new choice edge: the global hover lift can oscillate there.
   await page.mouse.move(0,0)
   await page.screenshot({path:info.outputPath(`choice-${i}.png`),fullPage:true});await option.click()
  }else{
   await expect.poll(currentText).toBe(beat.text)
   if(!heard&&pack.chinese?.lines[beat.text]?.audio){
    for(const name of ['Pinyin','English']){const b=page.getByRole('button',{name,exact:true});await b.click();await expect(page.locator(name==='Pinyin'?'.reader-interlinear-pinyin':'.reader-interlinear-gloss')).toHaveCount(0);await b.click()}
    const src=pack.chinese.lines[beat.text].audio!
    expect(await page.evaluate(async src=>{const ctx=new AudioContext();try{return (await ctx.decodeAudioData(await (await fetch(src)).arrayBuffer())).duration}finally{await ctx.close()}},src)).toBeGreaterThan(0)
    await page.getByRole('button',{name:'Play audio',exact:true}).click();await expect(page.getByRole('button',{name:'Pause audio',exact:true})).toBeVisible()
    await page.getByRole('button',{name:'Pause audio',exact:true}).click();heard=true
    await page.screenshot({path:info.outputPath('reading.png'),fullPage:true})
   }
   if(!resumed&&i>=Math.floor(route.beats.length/2)){
    // Wait for the asynchronous IndexedDB save before simulating a hard reload.
    await expect.poll(()=>page.evaluate(step=>new Promise<boolean>((ok,no)=>{
     const request=indexedDB.open('ChunkyChineseStory2',1)
     request.onerror=()=>no(request.error)
     request.onsuccess=()=>{const db=request.result,read=db.transaction('records').objectStore('records').getAll();read.onerror=()=>{db.close();no(read.error)};read.onsuccess=()=>{const saved=read.result.some(v=>Array.isArray(v?.steps)&&v.steps.length===step);db.close();ok(saved)}}
    }),i)).toBe(true)
    await page.reload();await page.getByRole('button',{name:'Game',exact:true}).click();await open()
    await expect.poll(currentText).toBe(beat.text);resumed=true
   }
   if(i===route.beats.length-1)await page.screenshot({path:info.outputPath('ending.png'),fullPage:true})
   await page.getByRole('button',{name:'Continue →',exact:true}).click()
  }
 }
 expect(heard).toBe(true);expect(resumed).toBe(true)
 await expect(page.getByRole('heading',{name:'Scene complete',exact:true})).toBeVisible()
})
