import {test,expect} from '@playwright/test'
import {selectSettings} from './helpers/settings'
const categories=['Reader','Flashcards','Goals','Appearance','Hotkeys','Imports & Packs','Flight mode','AI Story Generation','Account & Sync','Data Health','Backup & Export']
test('every settings area remains accessible without horizontal overflow',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Settings',exact:true}).first().click()
 await expect(page.getByRole('region',{name:'Reader',exact:true})).toBeVisible()
 for(const title of categories){
  await selectSettings(page,title)
  await expect(page.locator('.settings-category:visible')).toHaveCount(1)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 }
 await selectSettings(page,'Imports & Packs');await expect(page.getByLabel('Episode ZIP or JSON',{exact:true})).toBeVisible()
 await selectSettings(page,'Flight mode');await expect(page.getByRole('button',{name:'Prepare for flight'})).toBeVisible()
 await selectSettings(page,'Account & Sync');await expect(page.getByRole('button',{name:'Continue with Google'})).toBeVisible()
})
test('Reader preferences persist and Mangmi is a keyboard-accessible switch',async({page},info)=>{
 await page.goto('/');await page.getByRole('button',{name:'Settings',exact:true}).first().click()
 const theme=page.getByLabel('Reader theme',{exact:true}),size=page.getByLabel('Chinese font size',{exact:true}),spacing=page.getByLabel('Line spacing',{exact:true}),mangmi=page.getByRole('checkbox',{name:/Mangmi Air Y/})
 await theme.selectOption('dark');await size.fill('1.12');await spacing.fill('2.05')
 await mangmi.focus();await page.keyboard.press('Space');await expect(mangmi).toBeChecked()
 await selectSettings(page,'Appearance');await page.getByRole('checkbox',{name:/Dark mode/}).check()
 await selectSettings(page,'Reader');await page.screenshot({path:`.local/design/settings-redesign/dark-${info.project.name}.png`,fullPage:true})
 await page.reload();await page.getByRole('button',{name:'Settings',exact:true}).first().click()
 await expect(theme).toHaveValue('dark');await expect(size).toHaveValue('1.12');await expect(spacing).toHaveValue('2.05');await expect(mangmi).toBeChecked()
 await page.getByRole('button',{name:'Browse book library'}).click();await expect(page.locator('.settings-workspace')).toHaveCount(0)
})
