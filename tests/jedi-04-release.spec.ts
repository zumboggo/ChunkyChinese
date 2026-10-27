import {test,expect,type Page} from '@playwright/test'
import {readFileSync} from 'node:fs'
import {compileStory,initialStoryState,settleStory,advanceStory} from '../src/game/animation/shared/engine/story-engine.js'
const prior=JSON.parse(readFileSync('stories/animated/jedi-03.json','utf8'))
function completedPrior(){const story=compileStory(prior.script,prior.assets).story;let state=settleStory(story,initialStoryState(story));const choices=['q-lost','concealed','prep-pump','prep-listen','prep-evacuate','pledge','shared'];const steps:(string|null)[]=[];while(!state.ended){const option=story.nodes[state.cursor].type==='choice'?choices.shift()!:null;steps.push(option);state=advanceStory(story,state,option)}return {steps,seed:1,quizzes:[]}}
async function library(page:Page){await page.goto('/');await page.getByRole('button',{name:'Game',exact:true}).click();await page.getByLabel('Book',{exact:true}).selectOption('jedi')}
async function open(page:Page){await page.getByLabel('Episode',{exact:true}).selectOption({label:'04 · The Line We Hold'});await page.getByRole('button',{name:'Play / resume episode',exact:true}).click();await page.getByRole('button',{name:'Accept',exact:true}).click()}
test('completed prior save carries losses and water into a persistent opening',async({page},info)=>{
 await library(page)
 await page.evaluate(async progress=>{await new Promise<void>((ok,no)=>{const request=indexedDB.open('ChunkyChineseStory2',1);request.onsuccess=()=>{const db=request.result;const tx=db.transaction('records','readwrite');tx.objectStore('records').put(progress,'story2:guest:progress:jedi-03-v1');tx.oncomplete=()=>{db.close();ok()};tx.onerror=()=>no(tx.error)}})},completedPrior())
 await open(page)
 const recap=page.getByRole('region',{name:'Previous episode outcome'});await expect(recap).toContainText('completed save');await expect(recap).toContainText('Q and its recording are lost');await expect(recap).toContainText('10 buckets');await expect(recap).toContainText('spoke independently')
 await page.screenshot({path:info.outputPath('inherited-outcome.png'),fullPage:true})
 await page.keyboard.press('1');await expect(page.getByRole('region',{name:'Opening context'})).toBeVisible();await page.keyboard.press('3');await page.screenshot({path:info.outputPath('context.png'),fullPage:true});await page.keyboard.press('1')
 const video=page.locator('video');await expect(video).toBeVisible();await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThanOrEqual(2);expect(await video.evaluate((v:HTMLVideoElement)=>v.duration)).toBeCloseTo(9,0)
 await video.evaluate(async(v:HTMLVideoElement)=>{v.muted=true;await v.play();v.currentTime=v.duration-.3})
 await expect(page.locator('.episode-line')).toContainText('我和An')
 await page.getByRole('button',{name:'Continue →',exact:true}).click()
 await expect.poll(()=>page.evaluate(()=>new Promise<boolean>(ok=>{const r=indexedDB.open('ChunkyChineseStory2',1);r.onsuccess=()=>{const db=r.result;const q=db.transaction('records').objectStore('records').get('story2:guest:progress:jedi-04-v1');q.onsuccess=()=>{ok(q.result?.steps.length===1&&q.result?.continuity?.values[5]==='10');db.close()}}}))).toBe(true)
 await page.reload();await page.getByRole('button',{name:'Game',exact:true}).click();await page.getByRole('button',{name:'Resume',exact:true}).click();await expect(page.locator('.episode-line')).toContainText('你的手')
 await expect(recap).toHaveCount(0);await expect(video).toHaveCount(0)
 await page.getByText('Carried forward from Episode 3',{exact:true}).click();await expect(page.locator('details.episode-continuity')).toContainText('10 buckets')
 await page.getByRole('button',{name:'Restart intro',exact:true}).click();await page.keyboard.press('1');await page.keyboard.press('1');await expect(page.locator('.episode-line')).toContainText('你的手')
})
test('manual recap and reduced-motion missing-media fallback stay operable',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.route('**/jedi-04-intro.mp4',r=>r.abort());await library(page);await open(page)
 await expect(page.getByRole('heading',{name:'Neri expedition',exact:true})).toBeVisible();await page.keyboard.press('4');await page.getByRole('button',{name:/Q and its recording are lost/}).click()
 for(let i=0;i<5;i++)await page.keyboard.press('1')
 await page.getByRole('button',{name:'1 · Confirm outcome',exact:true}).click();await expect(page.getByRole('region',{name:'Opening context'})).toHaveClass(/is-static/);await page.keyboard.press('1');await page.getByRole('button',{name:'Continue to episode →',exact:true}).click();await expect(page.locator('.episode-line')).toBeVisible()
})
const next=JSON.parse(readFileSync('stories/animated/jedi-04.json','utf8'))
for(const outcome of ['bottle','diagram','both'])test(`listener and aftermath remain readable after ${outcome}`,async({page},info)=>{
 const story=compileStory(next.script,next.assets).story;let state=settleStory(story,initialStoryState(story));const choices=['admit','anchor','ask-her',outcome,'credit'],steps:(string|null)[]=[]
 while(!state.ended&&story.nodes[state.cursor].text!=='是。我说过，我可以。'){const option=story.nodes[state.cursor].type==='choice'?choices.shift()!:null;steps.push(option);state=advanceStory(story,state,option)}
 expect(state.ended).toBe(false)
 await library(page)
 await page.evaluate(async progress=>{await new Promise<void>(ok=>{const r=indexedDB.open('ChunkyChineseStory2',1);r.onsuccess=()=>{const db=r.result;const tx=db.transaction('records','readwrite');tx.objectStore('records').put(progress,'story2:guest:progress:jedi-04-v1');tx.oncomplete=()=>{db.close();ok()}}})},{steps,seed:1,quizzes:[],continuity:{sourceId:next.continuity.sourceId,values:next.continuity.states[0]}})
 await page.getByLabel('Episode',{exact:true}).selectOption({label:'04 · The Line We Hold'});await page.getByRole('button',{name:'Play / resume episode',exact:true}).click()
 await expect(page.locator('.episode-line')).toContainText('我说过');await page.locator('.story-stage').scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('an-returns.png'),fullPage:true})
 await page.getByRole('button',{name:'Play audio',exact:true}).click();await expect(page.getByRole('button',{name:'Pause audio',exact:true})).toBeVisible();await page.getByRole('button',{name:'Pause audio',exact:true}).click()
 await page.getByRole('button',{name:'Continue →',exact:true}).click();await expect(page.locator('.episode-line')).toContainText('还在发抖');await page.locator('.story-stage').scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('jonathan-aftermath.png'),fullPage:true})
 await page.emulateMedia({reducedMotion:'reduce'});await expect(page.locator('.episode-line')).toContainText('还在发抖')
})
