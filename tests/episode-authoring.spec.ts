import {test,expect} from '@playwright/test'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {compileStory,replayStory} from '../src/game/animation/shared/engine/story-engine.js'
import {evaluateOutcomeScorecard} from '../src/game/animation/outcomeScorecard'
import type {ChinesePackage} from '../src/game/animation/package'
type Beat={type:string;id?:string;text:string;option?:string}
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
  const category=pack.title.startsWith('The Name of the Wind')?'name-of-the-wind':pack.title.startsWith('The Voices Beneath the Water')?'jedi':/^Moonlight(?: Sculptor)?\s+\d+\b/i.test(pack.title)?'lms':'daily-life'
  await page.getByLabel('Book',{exact:true}).selectOption(category)
  // A bundled release may have the same title; resume this exact imported package.
  const releaseId=createHash('sha256').update(JSON.stringify(pack)).digest('hex')
  await expect(page.getByLabel('Episode',{exact:true}).locator(`option[value="${releaseId}"]`)).toHaveCount(1)
  await page.getByLabel('Episode',{exact:true}).selectOption(releaseId)
  await page.locator('.featured-episode').getByRole('button',{name:'Play / resume episode',exact:true}).click()
 }
 await open()
 if(pack.notice)await page.getByRole('button',{name:'Accept',exact:true}).click()
 if(pack.continuity){for(const field of pack.continuity.fields){await expect(page.getByRole('region',{name:'Previous episode outcome'}).getByRole('heading',{name:field.label,exact:true})).toBeVisible();await page.keyboard.press('1')}await page.getByRole('button',{name:'1 · Confirm outcome',exact:true}).click()}
 if(index%2)await page.emulateMedia({reducedMotion:'reduce'})
 let heard=false,resumed=false
 const currentText=()=>page.evaluate(()=>{
  const line=document.querySelector('.episode-line')
  return line?[...line.querySelectorAll('strong')].map(e=>e.textContent).join(''):document.querySelector('.story-dialogue > p')?.textContent??''
 })
 for(const [i,beat] of route.beats.entries()){
  if(beat.type==='choice'){
   const node=compileStory(pack.script,pack.assets).story.nodes.find((n:{type:string;id:string})=>n.type==='choice'&&n.id===beat.id)
   const optionIndex=node.options.findIndex((o:{id:string})=>o.id===beat.option)
   const option=page.getByRole('button',{name:`Choose option ${optionIndex+1}`,exact:true});await expect(option).toBeEnabled()
   const chunks=page.locator('.episode-choice-card').nth(optionIndex).locator('.reader-interlinear-chunk');if(pack.chinese?.lines[beat.text])await expect(chunks.first()).toBeVisible()
   expect(await option.evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true)
   // Keep the previous Continue pointer off the new choice edge: the global hover lift can oscillate there.
   await page.mouse.move(0,0)
   await page.screenshot({path:info.outputPath(`choice-${i}.png`),fullPage:true});if(pack.outcomeScorecard){await expect(page.locator('.outcome-scorecard')).toHaveCount(0);await page.keyboard.press(String(optionIndex+1))}else await option.click()
  }else{
   await expect.poll(currentText).toBe(beat.text)
   if(!heard&&pack.chinese?.lines[beat.text]?.audio){
    await page.locator('.episode-settings summary').click()
    for(const name of ['Pinyin','English']){const b=page.getByRole('checkbox',{name,exact:true});await b.uncheck();await expect(page.locator(name==='Pinyin'?'.reader-interlinear-pinyin':'.reader-interlinear-gloss')).toHaveCount(0);await b.check()}
    await page.locator('.episode-settings summary').click()
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
 if(pack.outcomeScorecard){
  const story=compileStory(pack.script,pack.assets).story
  const steps=route.beats.map(b=>b.type==='choice'?b.option!:null)
  const expected=evaluateOutcomeScorecard(pack.outcomeScorecard,replayStory(story,steps,1))
  const card=page.getByRole('region',{name:'Your outcome'})
  await expect(card).toContainText(`Balance: ${expected.balance}/100`)
  for(const c of expected.categories)await expect(card).toContainText(`${c.label}: ${c.score}/100`)
  for(const f of expected.facts)await expect(card).toContainText(f)
  expect(await card.evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true)
  await page.screenshot({path:info.outputPath('scorecard.png'),fullPage:true})
  await card.getByText(expected.facts.at(-1)!,{exact:true}).scrollIntoViewIfNeeded()
  await expect(card.getByText(expected.facts.at(-1)!,{exact:true})).toBeVisible()
  await page.screenshot({path:info.outputPath('scorecard-facts.png'),fullPage:true})
  await expect.poll(()=>page.evaluate(n=>new Promise<boolean>(ok=>{const request=indexedDB.open('ChunkyChineseStory2',1);request.onsuccess=()=>{const db=request.result,r=db.transaction('records').objectStore('records').getAll();r.onsuccess=()=>{ok(r.result.some(v=>v?.steps?.length===n));db.close()}}}),steps.length)).toBe(true)
  await page.reload();await page.getByRole('button',{name:'Game',exact:true}).click();await open()
  await expect(page.getByRole('region',{name:'Your outcome'})).toContainText(`Balance: ${expected.balance}/100`)
 }

})
