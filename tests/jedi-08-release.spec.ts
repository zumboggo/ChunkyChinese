import {test,expect,type Page} from '@playwright/test'
import {readFileSync} from 'node:fs'
import {compileStory,replayStory,advanceStory} from '../src/game/animation/shared/engine/story-engine.js'
import {continuityScript} from '../src/game/animation/continuity'
async function library(page:Page){await page.goto('/');await page.getByRole('button',{name:'Game',exact:true}).click();await page.getByLabel('Book',{exact:true}).selectOption('jedi')}
async function save(page:Page,id:string,progress:unknown){await page.evaluate(async({id,progress})=>new Promise<void>(ok=>{const r=indexedDB.open('ChunkyChineseStory2',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction('records','readwrite');tx.objectStore('records').put(progress,'story2:guest:progress:'+id);tx.oncomplete=()=>{db.close();ok()}}}),{id,progress})}
async function savedSteps(page:Page,count:number,id:string){await expect.poll(()=>page.evaluate((id)=>new Promise<number>(ok=>{const r=indexedDB.open('ChunkyChineseStory2',1);r.onsuccess=()=>{const db=r.result,q=db.transaction('records').objectStore('records').get('story2:guest:progress:'+id);q.onsuccess=()=>{ok(q.result?.steps.length??-1);db.close()}}}),id)).toBe(count)}
async function nextLine(page:Page){const line=page.locator('.episode-line'),before=await line.textContent();await expect(page.getByRole('button',{name:'Continue →',exact:true})).toBeEnabled();await page.keyboard.press('1');await expect(line).not.toHaveText(before)}
for(const n of [8]){
 const pack=JSON.parse(readFileSync(`stories/animated/jedi-0${n}.json`,'utf8')),id=`jedi-0${n}-v1`,title='Your Own Voice'
 async function open(page:Page){await page.getByLabel('Episode',{exact:true}).selectOption({label:`0${n} · ${title}`});await page.getByRole('button',{name:'Play / resume episode',exact:true}).click()}
 test(`Episode ${n} context, spoken teaser, controller and reload`,async({page},info)=>{
  await library(page);await open(page);await page.getByRole('button',{name:'Accept',exact:true}).click();for(let i=0;i<pack.continuity.fields.length;i++)await page.keyboard.press('1');await page.getByRole('button',{name:'1 · Confirm outcome',exact:true}).click()
  await page.keyboard.press('3');await expect(page.getByRole('region',{name:'Opening context'})).toHaveClass(/is-static/);await page.screenshot({path:info.outputPath('context.png'),fullPage:true});await page.keyboard.press('1')
  const v=page.locator('video');await expect(v).toBeVisible();await expect.poll(()=>v.evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThanOrEqual(2);expect(await v.evaluate((v:HTMLVideoElement)=>v.duration)).toBeCloseTo(9,0);await v.evaluate(async(v:HTMLVideoElement)=>{v.muted=true;await v.play()});await expect(page.locator('.episode-line')).toBeVisible({timeout:15000})
  await nextLine(page);await savedSteps(page,1,id);const text=(await page.locator('.episode-line').textContent())!;await page.reload();await page.getByRole('button',{name:'Game',exact:true}).click();await page.getByRole('button',{name:'Resume',exact:true}).click();await expect(page.locator('.episode-line')).toHaveText(text);await expect(v).toHaveCount(0)
 })
 test(`Episode ${n} missing teaser and reduced motion remain skippable`,async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.route(`**/jedi-0${n}-intro.mp4`,r=>r.abort());await library(page);await open(page);await page.getByRole('button',{name:'Accept',exact:true}).click();for(let i=0;i<pack.continuity.fields.length;i++)await page.keyboard.press('1');await page.getByRole('button',{name:'1 · Confirm outcome',exact:true}).click();await expect(page.getByRole('region',{name:'Opening context'})).toHaveClass(/is-static/);await page.keyboard.press('1');await page.getByRole('button',{name:'Continue to episode →',exact:true}).click();await expect(page.locator('.episode-line')).toBeVisible()
 })
 for(const route of ['take','trust','shared'])test(`Episode 8 ${route} inherited injury, listener aftermath and saved result`,async({page},info)=>{
  const values=pack.continuity.states.find((x:string[])=>x[8]==='signal'&&x[9]===(route==='take'?'destroy':route==='trust'?'preserve':'isolate')),continuity={sourceId:pack.continuity.sourceId,values}
  const story=compileStory(continuityScript(pack.script,pack.continuity,continuity),pack.assets).story;let s=replayStory(story,[],1);const choices=['ask',route==='shared'?'inspect':'hear'],steps:(string|null)[]=[]
  while(!s.ended&&story.nodes[s.cursor].text!=='他们会听吗？'){const c=story.nodes[s.cursor].type==='choice'?choices.shift()!:null;steps.push(c);s=advanceStory(story,s,c)}
  await library(page);await save(page,id,{steps,seed:1,quizzes:[],continuity});await open(page)
  await expect(page.locator('.episode-line')).toContainText('他们会听吗');await expect(page.getByRole('button',{name:'Pause audio',exact:true})).toBeVisible()
  await page.locator('.story-stage').scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('listener.png'),fullPage:true});await nextLine(page)
  await expect(page.locator('.episode-line')).toContainText('慢慢呼吸');await page.getByRole('button',{name:'Pause audio',exact:true}).click();await page.locator('.story-stage').scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('aftermath.png'),fullPage:true})
  await savedSteps(page,steps.length+1,id);await page.reload();await page.getByRole('button',{name:'Game',exact:true}).click();await page.getByRole('button',{name:'Resume',exact:true}).click();await expect(page.locator('.episode-line')).toContainText('慢慢呼吸')
  await nextLine(page);await page.getByRole('button',{name:'Continue →',exact:true}).click();await expect(page.locator('.episode-choice-card')).toHaveCount(route==='shared'?3:2)
  await page.getByRole('button',{name:`Choose option ${route==='shared'?3:route==='trust'?2:1}`,exact:true}).click();await expect(page.locator('.episode-line')).toContainText(route==='shared'?'锁好开关':route==='trust'?'Ren收好钥匙':'Ren给我钥匙')
  await savedSteps(page,steps.length+4,id);await page.reload();await page.getByRole('button',{name:'Game',exact:true}).click();await page.getByRole('button',{name:'Resume',exact:true}).click();await expect(page.locator('.episode-line')).toContainText(route==='shared'?'锁好开关':route==='trust'?'Ren收好钥匙':'Ren给我钥匙')
 })
}
