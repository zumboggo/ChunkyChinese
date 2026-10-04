import { expect, test } from '@playwright/test'
const book = {
 id: 'chapter-menu-test', packId: 'generated-stories', title: 'A ten-chapter reader', book: 1, chapterStart: 1, chapterEnd: 10,
 stories: Array.from({length:10},(_,i)=>({
  id: `menu-chapter-${i+1}`, title: `A short chapter with a longer title ${i+1}`, book:1,chapter:i+1,newWords:[],
  sentences:[{id:`menu-sentence-${i+1}`,storyId:`menu-chapter-${i+1}`,index:1,chinese:'我想看书。',pinyin:'wǒ xiǎng kàn shū',english:`I want to read chapter ${i+1}.`,targetWords:[],audioClipId:'',audioFilename:'',ssmlFilename:'',interlinear:[{chinese:'我',pinyin:'wǒ',gloss:'I'},{chinese:'想看书',pinyin:'xiǎng kàn shū',gloss:'want to read'}]}],
 })),
}
const manifest={packId:'generated-stories',name:'Test Stories',createdAt:'2026-10-04T00:00:00Z',audioAvailable:false,synthesizedAudioCount:0,storyCount:10,sentenceCount:10,books:[]}
test.use({ serviceWorkers: 'block' })
test('all ten chapters remain selectable on a phone and offline', async ({page, context}, testInfo) => {
 await page.goto('/', {waitUntil:'domcontentloaded'})
 await expect(page.locator('.dashboard-mode-card.reading-texts-start')).toBeVisible()
 await page.evaluate(async ({book,manifest}) => {
  await new Promise<void>((resolve,reject)=>{
   const req=indexedDB.open('chunky-chinese-vocab');req.onerror=()=>reject(req.error);req.onsuccess=()=>{
    const db=req.result;const tx=db.transaction(['readerPacks','readerBooks'],'readwrite');
    tx.objectStore('readerPacks').put({...manifest,installedAt:new Date().toISOString()});
    tx.objectStore('readerBooks').put(book);
    tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>reject(tx.error);
   }
  });
 },{book,manifest})
 await page.reload()
 await page.locator('.dashboard-mode-card.reading-texts-start').click()
 const card=page.locator('.reading-library-book',{hasText:'A ten-chapter reader'})
 await expect(card).toBeVisible()
 await card.getByRole('button',{name:'Start',exact:true}).click()
 await expect(page.locator('.reader-page-meta')).toContainText('Sentence 1 / 10')
 await expect(page.locator('.reader-interlinear-pinyin').first()).toBeVisible()
 await expect(page.locator('.reader-interlinear-gloss').first()).toHaveText('I')
 await expect(page.locator('.reader-translation')).toContainText('I want to read chapter 1.')
 await context.setOffline(true)
 await page.locator('.reader-quick-picker-button.chapter').click()
 await expect(page.getByRole('menuitemradio')).toHaveCount(10)
 await page.getByRole('menuitemradio').filter({hasText:'Chapter 10'}).click()
 await expect(page.locator('.reader-translation')).toContainText('I want to read chapter 10.')
 await expect(page.locator('.reader-page-meta')).toContainText('Sentence 10 / 10')
 await page.screenshot({path:testInfo.outputPath('chapter-menu-offline.png'),fullPage:true})
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await expect(page.getByRole('button',{name:/^Next sentence/})).toBeDisabled()
})
