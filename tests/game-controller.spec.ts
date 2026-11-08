import {test,expect} from '@playwright/test'

test('controller browses menus, scrolls playback, replays audio, and chooses with X and Y',async({page})=>{
 await page.addInitScript(()=>{
  const buttons=Array.from({length:16},()=>({pressed:false,touched:false,value:0}))
  Object.defineProperty(navigator,'getGamepads',{value:()=>[{connected:true,index:0,mapping:'standard',buttons,axes:[0,0]}]})
  Object.assign(window,{controllerButtons:buttons,voiceStarts:0})
  const play=HTMLMediaElement.prototype.play
  HTMLMediaElement.prototype.play=function(){
   ;(window as unknown as {voiceStarts:number}).voiceStarts++
   return play.call(this)
  }
 })
 await page.goto('/')
 await page.getByRole('button',{name:'Game',exact:true}).click()
 const game=page.getByRole('region',{name:'Game',exact:true})
 await expect(game.locator('.library-display')).toBeVisible()
 async function press(index:number){
  await page.evaluate(i=>{(window as unknown as {controllerButtons:{pressed:boolean}[]}).controllerButtons[i].pressed=true},index)
  await page.waitForTimeout(80)
  await page.evaluate(i=>{(window as unknown as {controllerButtons:{pressed:boolean}[]}).controllerButtons[i].pressed=false},index)
  await page.waitForTimeout(80)
 }
 // Library and settings retain the original menu controls.
 await game.locator('.library-display').focus()
 await press(0)
 await expect(page.getByLabel('Game text size')).toBeVisible()
 await page.getByLabel('Game text size').focus()
 await press(15)
 await expect(page.getByLabel('Game text size')).toHaveValue('1')
 await press(1)
 await expect(page.getByLabel('Game text size')).toBeHidden()
 await expect(game.locator('.library-display')).toBeFocused()
 await press(12)
 await expect(game.locator('.library-chooser')).toBeFocused()
 await press(0)
 await expect(page.getByLabel('Book',{exact:true})).toBeVisible()
 await press(13)
 await press(13)
 await expect(page.getByLabel('Book',{exact:true})).toBeFocused()
 await press(15)
 await press(13)
 await expect(page.getByRole('searchbox',{name:'Find an episode'})).toBeFocused()
 await press(1)
 await expect(page.getByLabel('Book',{exact:true})).toBeHidden()
 await game.locator('.library-display').focus()
 await page.keyboard.press('Enter')
 await page.getByLabel('Game text size').focus()
 await page.keyboard.press('ArrowRight')
 await expect(page.getByLabel('Game text size')).toHaveValue('2')
 await page.keyboard.press('Escape')
 await expect(page.getByLabel('Game text size')).toBeHidden()

 await page.setViewportSize({width:640,height:480})
 await game.locator('.practice-library > summary').click()
 await page.getByRole('button',{name:'Play demonstration',exact:true}).click()
 const story=game.locator('.animated-story')
 await expect(story).toBeVisible()
 const next=game.locator('[data-next]').first()
 await expect(next).toBeEnabled()
 const before=await story.getAttribute('data-story-step')
 await next.focus()
 // A now moves focus without activating the current control.
 await press(0)
 await expect(story).toHaveAttribute('data-story-step',before!)
 await expect(next).not.toBeFocused()
 // The D-pad scrolls the playback page instead of moving focus.
 await next.focus()
 await game.evaluate(el=>{el.scrollTop=0})
 await press(13)
 expect(await game.evaluate(el=>el.scrollTop)).toBeGreaterThan(0)
 await expect(next).toBeFocused()
 // X activates the focused/default control.
 await press(2)
 await expect(story).not.toHaveAttribute('data-story-step',before!)
 await expect(next).toBeEnabled()
 // B restarts the current line's audio rather than leaving the episode.
 await page.waitForTimeout(200)
 const starts=()=>page.evaluate(()=>(window as unknown as {voiceStarts:number}).voiceStarts)
 const beforeReplay=await starts()
 await press(1)
 await expect.poll(starts).toBeGreaterThan(beforeReplay)
 await expect(story).toBeVisible()
 // Continue to the demonstration's two choices, then select choice 2 with Y.
 for(let i=0;i<4&&await game.locator('.episode-choice').count()===0;i++){
  await expect(next).toBeEnabled()
  await next.focus()
  await press(2)
 }
 const choices=game.locator('.episode-choice')
 await expect(choices).toHaveCount(2)
 const beforeChoice=await story.getAttribute('data-story-step')
 await press(3)
 await expect(choices).toHaveCount(0)
 await expect(story).not.toHaveAttribute('data-story-step',beforeChoice!)
})
