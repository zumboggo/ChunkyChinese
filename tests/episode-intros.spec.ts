import {test,expect,type Page} from '@playwright/test'

async function openEpisode(page:Page,episode:number){
 await page.goto('/')
 await page.getByRole('button',{name:'Game',exact:true}).click()
 await page.locator('.episode-strip button').filter({hasText:new RegExp('^'+episode)}).click()
 await page.getByRole('button',{name:'Restart episode',exact:true}).click()
}

for(const episode of [15,16])test(`episode ${episode} intro is six seconds at 480p with sound and leads into reading`,async({page},info)=>{
 await page.emulateMedia({reducedMotion:'reduce'})
 await openEpisode(page,episode)
 const video=page.locator('.episode-intro video')
 await expect.poll(()=>video.evaluate(element=>{
  const media=element as HTMLVideoElement
  return {duration:media.duration,width:media.videoWidth,height:media.videoHeight,muted:media.muted}
 })).toEqual({duration:6,width:854,height:480,muted:false})
 await page.screenshot({path:'.local/design/intro-'+episode+'-'+info.project.name+'.png',fullPage:true})
 await page.getByRole('button',{name:'Play intro with sound',exact:true}).click()
 await expect.poll(()=>video.evaluate(element=>(element as HTMLVideoElement).currentTime)).toBeGreaterThan(0)
 await expect(page.locator('.animated-story')).toBeVisible({timeout:12000})
 await expect(page.getByRole('button',{name:'Continue →',exact:true})).toBeVisible()
})

test('painted intro plays with sound, ends into reading, and does not repeat on resume',async({page},info)=>{
 await page.emulateMedia({reducedMotion:'reduce'})
 await openEpisode(page,14)
 const intro=page.getByRole('region',{name:'Episode introduction'})
 await expect(intro).toBeVisible()
 await expect(page.locator('.animated-story')).toHaveCount(0)
 const video=intro.locator('video')
 await expect.poll(()=>video.evaluate(v=>({muted:(v as HTMLVideoElement).muted,duration:(v as HTMLVideoElement).duration}))).toEqual({muted:false,duration:6})
 await page.screenshot({path:'.local/design/intro-14-'+info.project.name+'.png',fullPage:true})
 await page.getByRole('button',{name:'Play intro with sound',exact:true}).click()
 await expect.poll(()=>video.evaluate(v=>(v as HTMLVideoElement).currentTime)).toBeGreaterThan(0)
 await expect(page.locator('.animated-story')).toBeVisible({timeout:12000})
 await expect(intro).toHaveCount(0)
 await page.getByRole('button',{name:'Continue →',exact:true}).click()
 await page.getByRole('button',{name:'← Story library',exact:true}).click()
 await page.getByRole('button',{name:'Resume',exact:true}).click()
 await expect(page.locator('.animated-story')).toBeVisible()
 await expect(intro).toHaveCount(0)
})

test('controller can skip the eagle intro and restart shows it again',async({page},info)=>{
 await page.emulateMedia({reducedMotion:'reduce'})
 await openEpisode(page,17)
 await expect(page.getByRole('heading',{name:'The golden eagle',exact:true})).toBeVisible()
 await page.screenshot({path:'.local/design/intro-17-'+info.project.name+'.png',fullPage:true})
 await page.keyboard.press('1')
 await expect(page.locator('.animated-story')).toBeVisible()
 await page.getByRole('button',{name:'← Story library',exact:true}).click()
 await page.locator('.episode-strip button').filter({hasText:/^17/}).click()
 await page.getByRole('button',{name:'Restart episode',exact:true}).click()
 await expect(page.getByRole('region',{name:'Episode introduction'})).toBeVisible()
 await page.getByRole('button',{name:'Skip intro →',exact:true}).click()
 await expect(page.locator('.animated-story')).toBeVisible()
})

test('blocked autoplay keeps sound enabled and missing media never blocks the story',async({page})=>{
 await page.addInitScript(()=>{HTMLMediaElement.prototype.play=()=>Promise.reject(new DOMException('Gesture required','NotAllowedError'))})
 await openEpisode(page,14)
 await expect(page.getByRole('button',{name:'Play intro with sound',exact:true})).toBeVisible()
 await expect(page.locator('.episode-intro video')).toHaveJSProperty('muted',false)
 await page.getByRole('button',{name:'Skip intro →',exact:true}).click()
 await expect(page.locator('.animated-story')).toBeVisible()
 await page.getByRole('button',{name:'← Story library',exact:true}).click()
 await page.route('**/cutscenes/moonlight-17-intro.mp4',route=>route.abort())
 await page.locator('.episode-strip button').filter({hasText:/^17/}).click()
 await page.getByRole('button',{name:'Restart episode',exact:true}).click()
 await expect(page.getByRole('status').filter({hasText:'The intro could not load.'})).toBeVisible()
 await page.getByRole('button',{name:'Continue to episode →',exact:true}).click()
 await expect(page.locator('.animated-story')).toBeVisible()
})
