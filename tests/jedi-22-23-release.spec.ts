import {test,expect,type Page} from '@playwright/test'
import {readFileSync} from 'node:fs'
import {compileStory,replayStory,advanceStory} from '../src/game/animation/shared/engine/story-engine.js'
import {continuityScript} from '../src/game/animation/continuity'
import {chooseEpisodeOption} from './helpers/episode-controls'
for(const n of [22,23]){
const pack=JSON.parse(readFileSync(`stories/animated/jedi-${n}.json`,'utf8')),prior=JSON.parse(readFileSync('stories/animated/jedi-08.json','utf8')),id=`jedi-${n}-v1`
async function library(page:Page){await page.goto('/');await page.getByRole('button',{name:'Game',exact:true}).click();await page.getByLabel('Book',{exact:true}).selectOption('jedi')}
async function open(page:Page){await page.getByLabel('Episode',{exact:true}).selectOption(id);await page.getByRole('button',{name:'Play / resume episode',exact:true}).click()}
async function save(page:Page,progress:unknown){await page.evaluate(async({id,progress})=>new Promise<void>(ok=>{const r=indexedDB.open('ChunkyChineseStory2',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction('records','readwrite');tx.objectStore('records').put(progress,'story2:guest:progress:'+id);tx.oncomplete=()=>{db.close();ok()}}}),{id,progress})}
const currentText=(page:Page)=>page.evaluate(()=>[...document.querySelectorAll('.episode-line strong')].map(e=>e.textContent).join(''))
test(`Episode ${n} teaser reaches story`,async({page},info)=>{
 await library(page);await open(page);await page.getByRole('button',{name:'Accept',exact:true}).click();for(const _ of pack.continuity.fields)await page.keyboard.press('1');await page.getByRole('button',{name:'1 · Confirm outcome',exact:true}).click()
 await page.keyboard.press('3');await expect(page.getByRole('region',{name:'Opening context'})).toHaveClass(/is-static/);await page.screenshot({path:info.outputPath('context.png'),fullPage:true});await page.keyboard.press('1')
 const video=page.locator('video');await expect(video).toHaveAttribute('src',new RegExp(`jedi-${n}-intro.mp4`));await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThanOrEqual(2);expect(await video.evaluate((v:HTMLVideoElement)=>v.duration)).toBeCloseTo(9,0)
 await video.evaluate(async(v:HTMLVideoElement)=>{v.muted=true;await v.play()});await expect(page.locator('.episode-line')).toBeVisible({timeout:15000})
})
test(`Episode ${n} unavailable teaser stays skippable`,async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.route(`**/jedi-${n}-intro.mp4`,r=>r.abort());await library(page);await open(page);await page.getByRole('button',{name:'Accept',exact:true}).click();for(const _ of pack.continuity.fields)await page.keyboard.press('1');await page.getByRole('button',{name:'1 · Confirm outcome',exact:true}).click();await expect(page.getByRole('region',{name:'Opening context'})).toHaveClass(/is-static/);await page.keyboard.press('1');await page.getByRole('button',{name:'Continue to episode →',exact:true}).click();await expect(page.locator('.episode-line')).toBeVisible()
})

test(`Episode ${n} listener and quiet aftermath survive resume`,async({page},info)=>{
 const graph=pack.continuity.stateGraph;const values:string[]=[];let cursor=graph.root;while(cursor!==-1){const node=graph.nodes[cursor];const [value,next]=Object.entries(node.edges)[0];values[node.field]=value;cursor=next as number}
 const continuity={sourceId:pack.continuity.sourceId,values},story=compileStory(continuityScript(pack.script,pack.continuity,continuity),pack.assets).story
 const target=n===22?'所有人要吃饭，不是来看你表演。':'我想听你的理由，不是只听你的结论。'
 const steps:(string|null)[]=[];let state=replayStory(story,steps,1)
 while(!state.ended&&story.nodes[state.cursor].text!==target){const node=story.nodes[state.cursor],c=node.type==='choice'?node.options[0].id:null;steps.push(c);state=advanceStory(story,state,c)}
 expect(state.ended).toBe(false);await library(page);await save(page,{steps,seed:1,quizzes:[],continuity});await open(page);await expect.poll(()=>currentText(page)).toBe(target)
 await page.getByRole('button',{name:'Play audio',exact:true}).click();await expect(page.getByRole('button',{name:'Pause audio',exact:true})).toBeVisible();await page.waitForTimeout(800);await page.screenshot({path:info.outputPath('listener.png'),fullPage:true});await page.getByRole('button',{name:'Pause audio',exact:true}).click()
 await page.getByRole('button',{name:'Continue →',exact:true}).click();state=advanceStory(story,state,null);await expect.poll(()=>currentText(page)).toBe(story.nodes[state.cursor].text);await page.waitForTimeout(800);await page.screenshot({path:info.outputPath('aftermath.png'),fullPage:true})

})
}
