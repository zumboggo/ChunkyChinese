import {test,expect,type Page} from '@playwright/test'
import {readFileSync} from 'node:fs'
import {compileStory,replayStory,advanceStory} from '../src/game/animation/shared/engine/story-engine.js'
import {continuityScript} from '../src/game/animation/continuity'
import {chooseEpisodeOption} from './helpers/episode-controls'
const pack=JSON.parse(readFileSync('stories/animated/jedi-09.json','utf8')),prior=JSON.parse(readFileSync('stories/animated/jedi-08.json','utf8')),id='jedi-09-v1'
async function library(page:Page){await page.goto('/');await page.getByRole('button',{name:'Game',exact:true}).click();await page.getByLabel('Book',{exact:true}).selectOption('jedi')}
async function open(page:Page){await page.getByLabel('Episode',{exact:true}).selectOption(id);await page.getByRole('button',{name:'Play / resume episode',exact:true}).click()}
async function save(page:Page,progress:unknown){await page.evaluate(async({id,progress})=>new Promise<void>(ok=>{const r=indexedDB.open('ChunkyChineseStory2',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction('records','readwrite');tx.objectStore('records').put(progress,'story2:guest:progress:'+id);tx.oncomplete=()=>{db.close();ok()}}}),{id,progress})}
const currentText=(page:Page)=>page.evaluate(()=>[...document.querySelectorAll('.episode-line strong')].map(e=>e.textContent).join(''))
test('Episode 9 context and new teaser reach the new story',async({page},info)=>{
 await library(page);await open(page);await page.getByRole('button',{name:'Accept',exact:true}).click();for(const _ of pack.continuity.fields)await page.keyboard.press('1');await page.getByRole('button',{name:'1 · Confirm outcome',exact:true}).click()
 await page.keyboard.press('3');await expect(page.getByRole('region',{name:'Opening context'})).toHaveClass(/is-static/);await page.screenshot({path:info.outputPath('context.png'),fullPage:true});await page.keyboard.press('1')
 const video=page.locator('video');await expect(video).toHaveAttribute('src',/jedi-09-intro.mp4/);await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThanOrEqual(2);expect(await video.evaluate((v:HTMLVideoElement)=>v.duration)).toBeCloseTo(9,0)
 await video.evaluate(async(v:HTMLVideoElement)=>{v.muted=true;await v.play()});await expect.poll(()=>currentText(page),{timeout:15000}).toBe('Ren在屋子外面等。妈妈答应了，他慢慢走来。')
})
test('Episode 9 unavailable teaser stays skippable with reduced motion',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.route('**/jedi-09-intro.mp4',r=>r.abort());await library(page);await open(page);await page.getByRole('button',{name:'Accept',exact:true}).click();for(const _ of pack.continuity.fields)await page.keyboard.press('1');await page.getByRole('button',{name:'1 · Confirm outcome',exact:true}).click();await expect(page.getByRole('region',{name:'Opening context'})).toHaveClass(/is-static/);await page.keyboard.press('1');await page.getByRole('button',{name:'Continue to episode →',exact:true}).click();await expect(page.locator('.episode-line')).toBeVisible()
})
for(const [east,mei]of [['take','dead'],['trust','alive'],['shared','dead']])test(`Episode 9 ${east}/${mei}: memories, listener aftermath and common ending`,async({page},info)=>{
 test.setTimeout(90000)
 const values=[...prior.continuity.states.find((v:string[])=>v[4]===mei&&v[8]==='signal'),east,'record'],continuity={sourceId:pack.continuity.sourceId,values},story=compileStory(continuityScript(pack.script,pack.continuity,continuity),pack.assets).story
 let state=replayStory(story,[],1);const steps:(string|null)[]=[],choices=['space','boundary','silence','outlet','own']
 while(!state.ended&&story.nodes[state.cursor].text!=='我愿意听。不表示我原谅你了。'){const choice=story.nodes[state.cursor].type==='choice'?choices.shift()!:null;steps.push(choice);state=advanceStory(story,state,choice)}
 await library(page);await save(page,{steps,seed:1,quizzes:[],continuity});await open(page)
 let reloaded=false;const seen:string[]=[]
 while(!state.ended){const node=story.nodes[state.cursor];let choice:string|null=null
  if(node.type==='choice'){choice=choices.shift()!;await chooseEpisodeOption(page,node.options.findIndex((o:{id:string})=>o.id===choice))}
  else{
   await expect.poll(()=>currentText(page)).toBe(node.text);seen.push(node.text)
   if(['我愿意听。不表示我原谅你了。','我没有忘记她。'].includes(node.text)){await expect(page.getByRole('button',{name:'Pause audio',exact:true})).toBeVisible();await page.locator('.story-stage').scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath(node.text.startsWith('我愿意')?'ren-listener.png':'jon-listener.png'),fullPage:true})}
   if(node.text==='我知道。'&&!reloaded){await page.getByRole('button',{name:'Pause audio',exact:true}).click();await page.locator('.story-stage').scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('aftermath.png'),fullPage:true});await expect.poll(()=>page.evaluate(id=>new Promise<number>(ok=>{const r=indexedDB.open('ChunkyChineseStory2',1);r.onsuccess=()=>{const db=r.result,q=db.transaction('records').objectStore('records').get('story2:guest:progress:'+id);q.onsuccess=()=>{ok(q.result?.steps.length??-1);db.close()}}}),id)).toBe(steps.length);await page.reload();await page.getByRole('button',{name:'Game',exact:true}).click();await page.getByRole('button',{name:'Resume',exact:true}).click();await expect.poll(()=>currentText(page)).toBe(node.text);reloaded=true}
   await page.getByRole('button',{name:'Continue →',exact:true}).click()
  }
  steps.push(choice);state=advanceStory(story,state,choice)
 }
 const text=seen.join('\n');expect(text.includes('Mei还活着')).toBe(mei==='alive');expect(text.includes('Mei去世了')).toBe(mei==='dead');expect(text.includes('只帮今天')).toBe(east==='shared');expect(seen.at(-1)).toBe('明天，我们一起回来修管子。');expect(reloaded).toBe(true);await expect(page.getByRole('heading',{name:'Scene complete',exact:true})).toBeVisible();await page.screenshot({path:info.outputPath('common-ending.png'),fullPage:true})
})
