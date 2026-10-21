import {test,expect} from '@playwright/test'
for(const destination of ['dashboard','flashcards','reader','listeningCourse'])test(`opens Game even with saved ${destination} activity`,async({page})=>{
 await page.addInitScript(destination=>localStorage.setItem('chunky-startup-resume-v1',JSON.stringify({version:1,destination,updatedAt:new Date().toISOString(),queueIds:['saved-word'],currentId:'saved-word',readerPackId:'missing',readerBookId:'missing'})),destination)
 await page.goto('/')
 await expect(page.getByRole('heading',{name:'Your story starts here',exact:true})).toBeVisible()
 await page.getByRole('button',{name:'Home',exact:true}).click()
 await expect(page.getByRole('heading',{name:'Your story starts here',exact:true})).toHaveCount(0)
 await page.reload()
 await expect(page.getByRole('heading',{name:'Your story starts here',exact:true})).toBeVisible()
})
