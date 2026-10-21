import {test,expect} from '@playwright/test'
import {readFileSync} from 'node:fs'
const pack=JSON.parse(readFileSync('stories/animated/moonlight-08-v2.json','utf8'))
const fixture={...pack,script:`story 2
scene hall
ambience hall
environment dust
show Hyun embarrassed left
show Instructor determined right
camera two Hyun Instructor cut
Instructor [neutral]: 希望你有好运气。
camera listener Hyun over 0.8
look Hyun down
I: 第一天就让别人取笑，我心里还不舒服。
move Instructor exit
show Dummy neutral right
camera action Hyun Dummy cut
perform Hyun sword-strike Dummy repeat 3 steady
I: 我没有休息。一下，又一下。
camera close Hyun over 0.6
sound chime
I: 力量增加了一点。
ambience none
environment none
I: 六个小时过去了。
end`}
async function open(page:any){
 await page.addInitScript(()=>{const Base=window.AudioContext;(window as any).__soundContexts=[];window.AudioContext=class extends Base {constructor(){super();(window as any).__soundContexts.push(this);}}})
 await page.route('**/stories/animated/gate-in-the-mist.json',route=>route.fulfill({json:fixture}))
 await page.goto('/');await page.getByRole('button',{name:'Game',exact:true}).click();await page.getByText('Practice & demonstrations',{exact:true}).click();await page.getByRole('button',{name:'Play demonstration'}).click()
}
test('face framing, two-shots and action shots work with optional ducked sound',async({page})=>{
 await open(page)
 const stage=page.locator('.story-stage'),face=page.locator('[data-actor="Hyun"] [data-emotion-face]'),next=page.getByRole('button',{name:'Continue →',exact:true})
 await expect(stage).toHaveAttribute('data-shot','two');const wide=await face.boundingBox();expect(wide).not.toBeNull()
 await expect(page.locator('.story-environment i')).toHaveCount(12)
 await expect.poll(()=>page.evaluate(()=>(window as any).__soundContexts.length)).toBe(0)
 await page.getByText('Sound & atmosphere',{exact:true}).click()
 await expect(page.getByRole('checkbox',{name:'Ambience',exact:true})).not.toBeChecked();await expect(page.getByRole('checkbox',{name:'Sound effects',exact:true})).not.toBeChecked()
 await page.getByRole('checkbox',{name:'Ambience',exact:true}).check();await page.getByRole('checkbox',{name:'Sound effects',exact:true}).check();await page.getByRole('checkbox',{name:'Sound captions',exact:true}).check()
 await expect.poll(()=>page.evaluate(()=>(window as any).__soundContexts[0]?.state)).toBe('running')
 await page.getByText('Sound & atmosphere',{exact:true}).click()
 await page.getByRole('button',{name:'Play audio',exact:true}).click();await expect(page.locator('.story-atmosphere')).toHaveAttribute('data-sound-ducked','true')
 await next.click();await expect(stage).toHaveAttribute('data-shot','listener');await expect(page.locator('.story-camera')).toHaveCSS('transition-duration','0.8s')
 await page.waitForTimeout(950)
 const close=await face.boundingBox(),bounds=await stage.boundingBox();expect(close!.height).toBeGreaterThan(wide!.height*1.3);expect(close!.x).toBeGreaterThan(bounds!.x);expect(close!.y).toBeGreaterThan(bounds!.y);expect(close!.x+close!.width).toBeLessThan(bounds!.x+bounds!.width);expect(close!.y+close!.height).toBeLessThan(bounds!.y+bounds!.height)
 await stage.screenshot({path:`test-results/closeup-${test.info().project.name.replaceAll(' ','-')}.png`})
 await next.click();await expect(stage).toHaveAttribute('data-shot','action');await expect(page.locator('.story-camera')).toHaveCSS('transition-duration','0s')
 await expect(page.getByText('[Sword strikes straw]',{exact:true})).toBeVisible();await expect(next).toBeEnabled()
 await stage.screenshot({path:`test-results/action-frame-${test.info().project.name.replaceAll(' ','-')}.png`})
 await next.click();await expect(page.getByText('[A bright chime]',{exact:true})).toBeVisible()
 await page.emulateMedia({reducedMotion:'reduce'});await expect(page.locator('.story-environment')).toHaveCount(0);await expect(page.locator('.story-camera')).toHaveCSS('transition-duration','0s')
 await next.click();await expect(page.locator('.story-sound-caption')).toHaveText(/\s*/)
 await page.getByRole('button',{name:'← Story library',exact:true}).click()
 await expect.poll(()=>page.evaluate(()=>(window as any).__soundContexts[0]?.state)).toBe('closed')
})
test('procedural effects render finite audio and speech ducking lowers their actual output',async({page})=>{
 await page.goto('/')
 const results=await page.evaluate(async()=>{
  const {SceneSound}=await import('/src/game/animation/shared/components/scene-sound.ts')
  const render=async(ducked:boolean)=>{
   const offline=new OfflineAudioContext(1,48000,48000)
   const context=new Proxy(offline,{get(target,key){if(key==='state')return 'running';if(key==='resume'||key==='close')return async()=>{};const v=Reflect.get(target,key,target);return typeof v==='function'?v.bind(target):v;}})
   const sound=new SceneSound(()=>context as unknown as AudioContext)
   sound.configure({ambience:false,effects:true,ambienceVolume:0,effectsVolume:1},'none',ducked);await sound.activate();sound.play('straw')
   const buffer=await offline.startRendering(),samples=buffer.getChannelData(0)
   return {energy:samples.slice(0,20000).reduce((sum,x)=>sum+x*x,0),tail:samples.slice(35000).reduce((sum,x)=>sum+Math.abs(x),0),peak:Math.max(...samples.map(Math.abs))}
  }
  return {normal:await render(false),ducked:await render(true)}
 })
 expect(results.normal.energy).toBeGreaterThan(.01);expect(results.normal.tail).toBe(0);expect(results.normal.peak).toBeLessThan(.8);expect(results.ducked.energy/results.normal.energy).toBeCloseTo(.22*.22,2)
})
