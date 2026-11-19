import {chooseEpisodeOption,continueEpisode,reviewEpisodeLine} from './helpers/episode-controls'
import {test,expect} from '@playwright/test'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {compileStory,replayStory} from '../src/game/animation/shared/engine/story-engine.js'
import {evaluateOutcomeScorecard} from '../src/game/animation/outcomeScorecard'
import {pixelShots} from '../src/game/animation/pixel/direction'
import {animationCursors} from '../src/game/animation/readingPresentation'
import type {ChinesePackage} from '../src/game/animation/package'
type Beat={type:string;id?:string;text:string;option?:string}
type Fixture={packagePath:string;routes:{choices:string[];beats:Beat[]}[];review?:{lines:string[]};catalog?:{id:string;category:string;intro?:{src:string;poster:string;durationSeconds?:number}}}
const fixture:Fixture=process.env.EPISODE_FIXTURE?JSON.parse(readFileSync(process.env.EPISODE_FIXTURE,'utf8')):{packagePath:'',routes:[]}
for(const [index,route] of fixture.routes.entries())test(`authoring route ${index+1}: ${route.choices.join('/')}`,async({page},info)=>{
 const retryTargets=JSON.parse(process.env.EPISODE_RETRY_TARGETS??'[]') as {title:string;project:string}[]
 test.skip(retryTargets.length>0&&!retryTargets.some(t=>t.title===info.title&&t.project===info.project.name),'Outside diagnostic retry')
 const pack=JSON.parse(readFileSync(fixture.packagePath,'utf8')) as ChinesePackage
 const directedShots=pixelShots(pack.script,compileStory(pack.script,pack.assets).story)
 const pixelPilot=!!directedShots
 const comicPilot=!!directedShots&&[...directedShots.values()].every(s=>s.comic)
 await page.goto('/');await page.getByRole('button',{name:'Game',exact:true}).click()
 await expect(page.locator('.game-page > p[role=status]').first()).toContainText(/Stories and drafts|Draft saved/ )
 await page.getByLabel('Import episode ZIP / JSON').setInputFiles(fixture.packagePath)
 await expect(page.getByLabel('Episode title',{exact:true})).toHaveValue(pack.title)
 await page.getByRole('button',{name:'Publish to my library',exact:true}).click()
 const open=async()=>{
  const category=pack.title.startsWith('Super Supportive')?'super-supportive':pack.title.startsWith('The Name of the Wind')?'name-of-the-wind':pack.title.startsWith('The Voices Beneath the Water')?'jedi':/^Moonlight(?: Sculptor)?\s+\d+\b/i.test(pack.title)?'lms':'daily-life'
  const chooser=page.getByRole('button',{name:'Choose story',exact:true})
  if(await chooser.getAttribute('aria-expanded')!=='true')await chooser.click()
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
   await page.screenshot({path:info.outputPath(`choice-${i}.png`),fullPage:true});if(pack.outcomeScorecard){await expect(page.locator('.outcome-scorecard')).toHaveCount(0);await page.keyboard.press(String(optionIndex+1))}else await chooseEpisodeOption(page,optionIndex)
  }else{
   await expect.poll(currentText).toBe(beat.text)
   if(pack.presentation?.mode==='reading'){
    const compiled=compileStory(pack.script,pack.assets).story
    const cursor=replayStory(compiled,route.beats.slice(0,i).map(b=>b.type==='choice'?b.option!:null),1).cursor
    const animated=!pixelPilot&&animationCursors(compiled,pack.presentation.animationLabels).has(cursor)
    await expect(page.locator('.animated-story')).toHaveAttribute('data-reading-screen',animated?'animation':'text')
    await expect(page.locator('.story-stage')).toHaveCount(animated?1:0)
    expect(await page.locator('.story-dialogue').evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true)
    expect(await page.locator('.episode-interlinear strong').first().evaluate(e=>parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(animated?22:26)
   }
   if(fixture.review?.lines.includes(beat.text))await reviewEpisodeLine(page,beat.text,info.outputPath(`directed-${i}.png`))
   if(!heard&&pack.chinese?.lines[beat.text]?.audio){
    await page.locator('.episode-settings > summary').click()
    for(const name of ['Pinyin','English text']){const checkbox=page.getByRole('checkbox',{name,exact:true});await checkbox.uncheck();await expect(page.locator(name==='Pinyin'?'.reader-interlinear-pinyin':'.reader-interlinear-gloss')).toHaveCount(0);await checkbox.check();await expect(checkbox).toBeChecked()}
    await page.locator('.episode-settings > summary').click()
    const src=pack.chinese.lines[beat.text].audio!
    expect(await page.evaluate(async src=>{const ctx=new AudioContext();try{return (await ctx.decodeAudioData(await (await fetch(src)).arrayBuffer())).duration}finally{await ctx.close()}},src)).toBeGreaterThan(0)
    await reviewEpisodeLine(page,beat.text,info.outputPath('reading.png'));heard=true
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
   if(comicPilot)await expect(page.locator('.comic-panel')).toBeVisible()
   // A changing text height can leave the pointer on the hover-transform edge.
   await continueEpisode(page)
   if(pixelPilot){
    await expect(page.getByText('Encounter 2 of 3',{exact:true})).toBeVisible()
    await expect(page.locator('.pixel-scene')).toHaveCount(0)
    await continueEpisode(page)
    await expect(page.getByText('Encounter 3 of 3',{exact:true})).toBeVisible()
    await expect(page.locator('.pixel-scene')).toHaveCount(0)
    await continueEpisode(page)
    if(!comicPilot){
    await expect(page.locator('.pixel-scene')).toBeVisible()
    await expect(page.locator('.episode-line,.story-stage')).toHaveCount(0)
    await expect(page.locator('.pixel-scene')).toHaveAttribute('data-pixel-phase','held')
    if(fixture.review?.lines.includes(beat.text))await page.screenshot({path:info.outputPath(`pixel-${i}.png`),fullPage:true})
    await page.getByRole('button',{name:'Next →',exact:true}).click()
    }
   }
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

if(fixture.catalog?.intro)test('planned opening plays with sound and transitions into this episode',async({page},info)=>{
 const pack=JSON.parse(readFileSync(fixture.packagePath,'utf8')) as ChinesePackage
 const id='authoring-intro-preview',path='authoring-intro-preview.json',entry={...fixture.catalog,id,path,summary:{title:pack.title,description:pack.description}}
 const catalog=JSON.parse(readFileSync('public/stories/animated/catalog.json','utf8'))
 await page.route('**/public/stories/animated/catalog.json*',route=>route.fulfill({contentType:'application/javascript',body:'export default '+JSON.stringify([...catalog,entry])}))
 await page.route('**/stories/animated/'+path,route=>route.fulfill({json:pack}))
 await page.goto('/');await page.getByRole('button',{name:'Game',exact:true}).click()
 await page.getByRole('button',{name:'Choose story',exact:true}).click()
 await page.getByLabel('Book',{exact:true}).selectOption(entry.category!)
 await expect(page.getByLabel('Episode',{exact:true}).locator(`option[value="${id}"]`)).toHaveCount(1)
 await page.getByLabel('Episode',{exact:true}).selectOption(id)
 await page.getByRole('button',{name:'Play / resume episode',exact:true}).click()
 if(pack.notice)await page.getByRole('button',{name:'Accept',exact:true}).click()
 const video=page.locator('.episode-intro video')
 await expect(video).toBeVisible()
 await expect.poll(()=>video.evaluate(v=>({duration:(v as HTMLVideoElement).duration,muted:(v as HTMLVideoElement).muted}))).toEqual({duration:entry.intro!.durationSeconds,muted:false})
 await page.screenshot({path:info.outputPath('opening.png'),fullPage:true})
 const play=page.getByRole('button',{name:'Play intro with sound',exact:true})
 if(await play.isVisible()){await play.focus();await play.press('Enter')}
 await expect.poll(()=>video.evaluate(v=>!(v as HTMLVideoElement).paused)).toBe(true)
 await expect(page.locator('.animated-story')).toBeVisible({timeout:60000}).catch(async error=>{console.error('Intro media state:',await video.evaluate(v=>{const m=v as HTMLVideoElement;return {time:m.currentTime,duration:m.duration,paused:m.paused,ended:m.ended,ready:m.readyState,error:m.error?.message}}));throw error})
})
